const https = require('https');
const http = require('http');
const mongoose = require('mongoose');
const config = require('../config/config');
const logger = require('../config/logger');

/**
 * 发起 HTTP/HTTPS 请求的通用封装（兼容 Node 内置模块，无需 axios）
 * @param {object} options - Node http/https request options
 * @param {string|null} body - 请求体字符串
 * @returns {Promise<{statusCode: number, data: any}>}
 */
const httpRequest = (options, body = null) => {
  return new Promise((resolve, reject) => {
    const isHttps = options.protocol === 'https:' || !options.protocol;
    const transport = isHttps ? https : http;
    const startTime = Date.now();

    // 每次请求使用独立连接，避免连接复用导致的挂起
    const requestOptions = { ...options, agent: false };

    const req = transport.request(requestOptions, (res) => {
      let rawData = '';
      res.on('data', (chunk) => { rawData += chunk; });
      res.on('end', () => {
        const elapsed = Date.now() - startTime;
        logger.info(`⏱️ [DNB API] ${options.method} ${options.path} | 耗时: ${elapsed}ms | 状态: ${res.statusCode}`);
        try {
          resolve({ statusCode: res.statusCode, data: JSON.parse(rawData) });
        } catch {
          resolve({ statusCode: res.statusCode, data: rawData });
        }
      });
    });

    req.on('error', (err) => {
      const elapsed = Date.now() - startTime;
      logger.error(`[DNB API] 请求失败: ${err.message} (已等待 ${elapsed}ms)`);
      reject(err);
    });

    // 将超时延长至 120 秒，生产环境网络延迟较高
    const TIMEOUT_MS = 120000;
    req.setTimeout(TIMEOUT_MS, () => {
      const elapsed = Date.now() - startTime;
      req.destroy(new Error(`DNB API 请求超时（超过 ${TIMEOUT_MS / 1000}s，已等待 ${elapsed}ms）`));
    });

    if (body) req.write(body);
    req.end();
  });
};

/**
 * 从 DNB BCOC 平台获取访问令牌（accessToken）
 * 使用 config.dnb 中配置的 appId 和 appSecret
 * @returns {Promise<string>} accessToken
 */
const getToken = async () => {
  const { baseUrl, appId, appSecret, cookie } = config.dnb;

  // 解析域名和路径
  const url = new URL(`${baseUrl}/bcoc/bcocGenerateToken`);
  const requestBody = JSON.stringify({ appId, appSecret });

  const options = {
    hostname: url.hostname,
    port: url.port || (url.protocol === 'https:' ? 443 : 80),
    path: url.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(requestBody),
      'Cookie': cookie || '',
    },
    rejectUnauthorized: false, // 允许自签名证书（企业内网场景）
  };

  const { statusCode, data } = await httpRequest(options, requestBody);

  if (statusCode !== 200 || data?.code !== 200) {
    throw new Error(`DNB Token 获取失败: code=${data?.code}, message=${data?.message || '未知错误'}`);
  }

  // 实际响应结构为扁平格式：{ code, accessToken, expiresIn, ... }
  // 无需多层 data.data 取值
  const accessToken = data?.accessToken;
  if (!accessToken) {
    throw new Error(`DNB Token 响应中未包含 accessToken 字段，实际响应：${JSON.stringify(data)}`);
  }

  logger.info('[DNB] accessToken 获取成功');
  return accessToken;
};

/**
 * 通过 globalUltimateDuns 分页获取家族树数据
 * @param {string} accessToken - 由 getToken() 获取的令牌
 * @param {string} globalUltimateDuns - Global Ultimate Duns 号码
 * @param {number} pageNumber - 页码（从 1 开始）
 * @returns {Promise<{members: Array, totalMembersCount: number}>} 当前页成员数组及总成员数
 */
const fetchFamilyTree = async (accessToken, globalUltimateDuns, pageNumber = 1) => {
  const { baseUrl, cookie } = config.dnb;
  const url = new URL(`${baseUrl}/bcoc/B/EDC/v1/familyTree/${globalUltimateDuns}`);
  url.searchParams.set('blockIDs', 'familytree_L1_v1');
  // 传入页码参数（每页固定 1000 条）
  url.searchParams.set('pageNumber', String(pageNumber));

  const options = {
    hostname: url.hostname,
    port: url.port || (url.protocol === 'https:' ? 443 : 80),
    path: url.pathname + url.search,
    method: 'GET',
    headers: {
      'bcoc-access-token': accessToken,
      'X-Client-Id': 'S-SCM',
      'Cookie': cookie || '',
    },
    rejectUnauthorized: false,
  };

  const { statusCode, data } = await httpRequest(options);

  if (statusCode !== 200 || data?.code !== 'SVC-200') {
    throw new Error(`DNB 家族树第 ${pageNumber} 页获取失败: code=${data?.code}, message=${data?.message || '未知错误'}`);
  }

  const members = data?.outData?.data?.familyTreeMembers;
  // 总成员数由 API 每次响应都会返回，以第1页为准
  const totalMembersCount = data?.outData?.data?.globalUltimateFamilyTreeMembersCount ?? 0;

  if (!Array.isArray(members)) {
    throw new Error(`DNB 家族树响应结构异常：第 ${pageNumber} 页 familyTreeMembers 不是数组`);
  }

  logger.info(`[DNB] 第 ${pageNumber} 页获取成功，本页 ${members.length} 条，API 报告总成员数: ${totalMembersCount}`);
  return { members, totalMembersCount };
};

/**
 * 将家族树成员数据 Upsert 到 MongoDB 动态集合中
 * 以每条记录的 "duns" 字段作为主键
 * @param {string} collectionName - 目标集合名称（如 DNBFamilyTree-CNPC-544940385）
 * @param {Array} members - familyTreeMembers 数组
 * @returns {Promise<{upserted: number, modified: number}>} 操作结果统计
 */
const upsertFamilyTree = async (collectionName, members) => {
  const collection = mongoose.connection.db.collection(collectionName);

  // 构建 bulkWrite 的 upsert 操作列表，以 duns 字段为主键
  const operations = members.map((member) => ({
    updateOne: {
      filter: { duns: member.duns },
      update: { $set: { ...member, _syncedAt: new Date() } },
      upsert: true,
    },
  }));

  if (operations.length === 0) {
    return { upserted: 0, modified: 0 };
  }

  const result = await collection.bulkWrite(operations, { ordered: false });
  logger.info(`[DNB] Upsert 完成 → 集合: ${collectionName}, 新增: ${result.upsertedCount}, 更新: ${result.modifiedCount}`);

  return {
    upserted: result.upsertedCount,
    modified: result.modifiedCount,
    total: members.length,
  };
};

/**
 * 一体化方法：获取 Token → 分页拉取完整家族树 → Upsert 到 MongoDB
 *
 * 流程：
 *  1. 获取 accessToken
 *  2. 请求第 1 页，从响应中读取 globalUltimateFamilyTreeMembersCount
 *     并将该字段回写到 keycustomer 表对应记录
 *  3. 根据总成员数和每页 1000 条，计算总页数
 *  4. 循环请求第 2..N 页，汇总所有成员
 *  5. 将全量数据 Upsert 到家族树集合
 *
 * @param {string} globalUltimateDuns - Global Ultimate Duns 号码
 * @param {string} collectionName - 目标 MongoDB 家族树集合名称
 * @param {string|null} keycustomerId - keycustomer 表的 _id（用于回写字段）
 * @returns {Promise<object>} 操作结果（含 totalPages / totalMembersCount）
 */
const syncFamilyTree = async (globalUltimateDuns, collectionName, keycustomerId = null) => {
  const PAGE_SIZE = 1000; // API 每页固定返回 1000 条

  // 步骤 1：获取访问令牌
  const accessToken = await getToken();

  // 步骤 2：请求第 1 页，获取总成员数
  const { members: firstPageMembers, totalMembersCount } = await fetchFamilyTree(accessToken, globalUltimateDuns, 1);

  // 步骤 2b：将 globalUltimateFamilyTreeMembersCount 回写到 keycustomer 表
  if (keycustomerId && totalMembersCount > 0) {
    try {
      const { ObjectId } = mongoose.Types;
      const keycustomerCol = mongoose.connection.db.collection('keycustomer');
      await keycustomerCol.updateOne(
        { _id: new ObjectId(keycustomerId) },
        { $set: { globalUltimateFamilyTreeMembersCount: totalMembersCount } }
      );
      logger.info(`[DNB] 将 globalUltimateFamilyTreeMembersCount=${totalMembersCount} 写入 keycustomer._id=${keycustomerId}`);
    } catch (updateErr) {
      // 回写失败不阻断主流程
      logger.warn(`[DNB] 回写 keycustomer 失败：${updateErr.message}`);
    }
  }

  // 步骤 3：计算总页数
  const totalPages = totalMembersCount > 0 ? Math.ceil(totalMembersCount / PAGE_SIZE) : 1;
  logger.info(`[DNB] 家族树同步开始 → Duns: ${globalUltimateDuns}, 总成员数: ${totalMembersCount}, 总页数: ${totalPages}`);

  // 汇总所有成员，从第 1 页结果开始
  let allMembers = [...firstPageMembers];

  // 步骤 4：串行拉取剩余页（避免并发过高触发限流）
  for (let page = 2; page <= totalPages; page++) {
    logger.info(`[DNB] 正在拉取第 ${page}/${totalPages} 页...`);
    const { members } = await fetchFamilyTree(accessToken, globalUltimateDuns, page);
    allMembers = allMembers.concat(members);
  }

  logger.info(`[DNB] 全部页面拉取完毕，实际汇总 ${allMembers.length} 条（API 报告: ${totalMembersCount} 条）`);

  // 步骤 5：Upsert 到 MongoDB
  const stats = await upsertFamilyTree(collectionName, allMembers);

  return {
    collectionName,
    globalUltimateDuns,
    totalMembersCount,   // API 报告的家族树总成员数
    totalPages,          // 实际请求的总页数
    membersCount: allMembers.length, // 实际汇总的记录数
    ...stats,
  };
};

/**
 * 带实时进度回调的分页同步方法（供 SSE 端点使用）
 * 每完成一页的拉取+Upsert，即调用 onProgress(page, totalPages, totalMembersCount)
 *
 * @param {string} globalUltimateDuns
 * @param {string} collectionName
 * @param {string|null} keycustomerId
 * @param {Function} onProgress - 回调函数：(page, totalPages, totalMembersCount) => void
 * @returns {Promise<object>}
 */
const syncFamilyTreeWithProgress = async (globalUltimateDuns, collectionName, keycustomerId = null, onProgress = null) => {
  const PAGE_SIZE = 1000;

  // 步骤 1：获取 Token
  const accessToken = await getToken();

  // 步骤 2：第 1 页
  const { members: firstPageMembers, totalMembersCount } = await fetchFamilyTree(accessToken, globalUltimateDuns, 1);
  const totalPages = totalMembersCount > 0 ? Math.ceil(totalMembersCount / PAGE_SIZE) : 1;

  logger.info(`[DNB][Stream] 家族树同步开始 → Duns: ${globalUltimateDuns}, 总成员数: ${totalMembersCount}, 总页数: ${totalPages}`);

  // 第 1 页 Upsert
  await upsertFamilyTree(collectionName, firstPageMembers);

  // 回写 keycustomer
  if (keycustomerId && totalMembersCount > 0) {
    try {
      const { ObjectId } = mongoose.Types;
      const keycustomerCol = mongoose.connection.db.collection('keycustomer');
      await keycustomerCol.updateOne(
        { _id: new ObjectId(keycustomerId) },
        { $set: { globalUltimateFamilyTreeMembersCount: totalMembersCount } }
      );
    } catch (e) {
      logger.warn(`[DNB][Stream] 回写 keycustomer 失败：${e.message}`);
    }
  }

  // 第 1 页完成后推送进度
  if (onProgress) onProgress(1, totalPages, totalMembersCount);

  let totalUpserted = firstPageMembers.length;

  // 步骤 3：逐页拉取 + Upsert + 推送进度
  for (let page = 2; page <= totalPages; page++) {
    logger.info(`[DNB][Stream] 拉取第 ${page}/${totalPages} 页...`);
    const { members } = await fetchFamilyTree(accessToken, globalUltimateDuns, page);
    await upsertFamilyTree(collectionName, members);
    totalUpserted += members.length;
    if (onProgress) onProgress(page, totalPages, totalMembersCount);
  }

  logger.info(`[DNB][Stream] 全部完成，实际写入 ${totalUpserted} 条（API 报告: ${totalMembersCount} 条）`);

  return {
    collectionName,
    globalUltimateDuns,
    totalMembersCount,
    totalPages,
    membersCount: totalUpserted,
  };
};

module.exports = {
  getToken,
  fetchFamilyTree,
  upsertFamilyTree,
  syncFamilyTree,
  syncFamilyTreeWithProgress,
};
