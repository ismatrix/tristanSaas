const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const dnbService = require('../services/dnb.service');

/**
 * 同步 DNB 家族树数据
 * POST /api/v1/dnb/family-tree
 * 请求体：{ globalUltimateDuns: string, collectionName: string, keycustomerId?: string }
 */
const syncFamilyTree = catchAsync(async (req, res) => {
  const { globalUltimateDuns, collectionName, keycustomerId } = req.body;

  if (!globalUltimateDuns) {
    return res.status(httpStatus.BAD_REQUEST).json({
      code: 400,
      message: 'globalUltimateDuns 为必填参数',
    });
  }

  if (!collectionName) {
    return res.status(httpStatus.BAD_REQUEST).json({
      code: 400,
      message: 'collectionName 为必填参数',
    });
  }

  // keycustomerId 为可选参数，传入时会将 globalUltimateFamilyTreeMembersCount 回写到 keycustomer 表
  const result = await dnbService.syncFamilyTree(globalUltimateDuns, collectionName, keycustomerId || null);

  res.status(httpStatus.OK).json({
    code: 200,
    message: '家族树数据同步成功',
    data: result,
  });
});

/**
 * SSE 流式同步 DNB 家族树数据（实时推送分页进度）
 * GET /api/v1/dnb/family-tree/sync-stream
 * 查询参数：globalUltimateDuns, collectionName, keycustomerId?
 *
 * SSE 事件格式（每行 data: JSON\n\n）：
 *   { type: 'start',    totalPages, totalMembersCount }
 *   { type: 'progress', page, totalPages, totalMembersCount }
 *   { type: 'done',     totalPages, totalMembersCount, membersCount }
 *   { type: 'error',    message }
 */
const syncFamilyTreeStream = async (req, res) => {
  const { globalUltimateDuns, collectionName, keycustomerId } = req.query;

  // 参数校验（SSE 不能用 catchAsync，需手动处理）
  if (!globalUltimateDuns || !collectionName) {
    res.status(400).json({ code: 400, message: 'globalUltimateDuns 和 collectionName 为必填参数' });
    return;
  }

  // 设置 SSE 响应头
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no', // 禁用 Nginx 缓冲
  });

  // 辅助：推送一条 SSE 事件
  const send = (payload) => {
    try {
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    } catch (e) {
      // 连接已断开，忽略写入错误
    }
  };

  try {
    const result = await dnbService.syncFamilyTreeWithProgress(
      globalUltimateDuns,
      collectionName,
      keycustomerId || null,
      // onProgress 回调：每页完成后推送进度
      (page, totalPages, totalMembersCount) => {
        send({ type: 'progress', page, totalPages, totalMembersCount });
      }
    );
    // 全部完成
    send({ type: 'done', ...result });
  } catch (err) {
    send({ type: 'error', message: err.message || '同步失败' });
  } finally {
    res.end();
  }
};

/**
 * 批量同步 DNB 公司详情
 * POST /api/v1/dnb/company-detail/sync
 * 请求体：{ dunsList: Array<string> }
 */
const syncCompanyDetail = catchAsync(async (req, res) => {
  const { dunsList, guDuns } = req.body;
  if (!Array.isArray(dunsList) || dunsList.length === 0) {
    return res.status(httpStatus.BAD_REQUEST).json({
      code: 400,
      message: 'dunsList 参数必须是非空数组',
    });
  }

  const result = await dnbService.syncCompanyDetail(dunsList, guDuns || null);
  res.status(httpStatus.OK).json({
    code: 200,
    message: '详情同步执行完毕',
    data: result,
  });
});

/**
 * 批量检查 DUNS 公司详情在数据库中是否存在
 * POST /api/v1/dnb/company-detail/check-exist
 * 请求体：{ dunsList: Array<string> }
 */
const checkCompanyDetailExist = catchAsync(async (req, res) => {
  const { dunsList } = req.body;
  if (!Array.isArray(dunsList)) {
    return res.status(httpStatus.BAD_REQUEST).json({
      code: 400,
      message: 'dunsList 参数必须是数组',
    });
  }

  const existingDuns = await dnbService.checkCompanyDetailExist(dunsList);
  res.status(httpStatus.OK).json({
    code: 200,
    data: existingDuns,
  });
});

/**
 * 获取单个 DUNS 详情
 * GET /api/v1/dnb/company-detail/:duns
 */
const getCompanyDetail = catchAsync(async (req, res) => {
  const { duns } = req.params;
  if (!duns) {
    return res.status(httpStatus.BAD_REQUEST).json({
      code: 400,
      message: 'duns 参数不能为空',
    });
  }

  const data = await dnbService.getCompanyDetailByDuns(duns);
  if (!data) {
    return res.status(httpStatus.NOT_FOUND).json({
      code: 404,
      message: '未找到该 DUNS 的详情记录',
    });
  }

  res.status(httpStatus.OK).json({
    code: 200,
    data,
  });
});

module.exports = {
  syncFamilyTree,
  syncFamilyTreeStream,
  syncCompanyDetail,
  checkCompanyDetailExist,
  getCompanyDetail,
};

