#!/usr/bin/env node
/**
 * MongoDB 数据库同步脚本
 * 功能：将开发端指定集合同步到生产服务器端
 * 使用方式：node syncMongoDB.js
 *
 * 流程：
 *  1. 在本地使用 mongodump 导出指定集合
 *  2. 通过 scp 将 dump 目录传输到生产服务器
 *  3. 在生产端使用 mongorestore --drop 覆盖导入
 *  4. 清理临时文件
 */

const { execSync, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// ============================================================
// 配置区域（按需修改）
// ============================================================
const CONFIG = {
  // 本地开发端 MongoDB 连接
  LOCAL_MONGODB: 'mongodb://127.0.0.1:27017',
  LOCAL_DB: 'node-boilerplate',

  // 生产服务器连接信息
  REMOTE_HOST: 'office.ringapark.com',
  REMOTE_PORT: 6822,
  REMOTE_USER: 'tristan',
  REMOTE_MONGODB: 'mongodb://127.0.0.1:27017',
  REMOTE_DB: 'node-boilerplate',

  // 生产端 MongoDB 运行在 Docker 容器内，容器名称如下
  REMOTE_MONGO_CONTAINER: 'mongodb',

  // 远端临时存放路径（宿主机）
  REMOTE_TMP_DIR: '/home/tristan/tmp_mongo_sync',

  // 容器内临时目录（挂载或 docker cp 使用）
  CONTAINER_TMP_DIR: '/tmp/mongo_sync',

  // 本地临时导出目录
  LOCAL_DUMP_DIR: path.join(__dirname, 'tmp_mongo_dump'),

  // 本地 mongodump 工具路径
  MONGODUMP_BIN: process.env.MONGODUMP_BIN || '/opt/homebrew/bin/mongodump',
};

// ============================================================
// 需要同步的集合列表
// 修改此数组以控制同步范围
// ============================================================
const COLLECTIONS_TO_SYNC = [
  // DNB 公司详情缓存（新功能依赖）
  'dnbCompanyDetail',

  // DNBWebFamilyTree 系列（共 69 个）
  'DNBWebFamilyTree-ABC-653713891',
  'DNBWebFamilyTree-Alibaba-864402453',
  'DNBWebFamilyTree-AntGroup-526043754',
  'DNBWebFamilyTree-Baidu-528181015',
  'DNBWebFamilyTree-BOC-653708438',
  'DNBWebFamilyTree-BOCOM-654510585',
  'DNBWebFamilyTree-BYD-654510015',
  'DNBWebFamilyTree-CBN-721858346',
  'DNBWebFamilyTree-CCAG-516741880',
  'DNBWebFamilyTree-CCB-654504299',
  'DNBWebFamilyTree-CCT-420920381',
  'DNBWebFamilyTree-CDT-544902661',
  'DNBWebFamilyTree-CEAH-544648801',
  'DNBWebFamilyTree-CEEC-421297147',
  'DNBWebFamilyTree-CETC-529058632',
  'DNBWebFamilyTree-CFGC-544697675',
  'DNBWebFamilyTree-CHD-544956311',
  'DNBWebFamilyTree-Chinalco-544840788',
  'DNBWebFamilyTree-ChinaLife-544920770',
  'DNBWebFamilyTree-ChinaPost-527724684',
  'DNBWebFamilyTree-ChinaRailway-421309942',
  'DNBWebFamilyTree-CHINT-420050304',
  'DNBWebFamilyTree-CHNEnergy-544629942',
  'DNBWebFamilyTree-CHNG-544871965',
  'DNBWebFamilyTree-CITIC-653708479',
  'DNBWebFamilyTree-CMB-653715839',
  'DNBWebFamilyTree-CMRG-845486632',
  'DNBWebFamilyTree-CNADG-654291343',
  'DNBWebFamilyTree-CNCEC-528191342',
  'DNBWebFamilyTree-CNPC-653713339',
  'DNBWebFamilyTree-COSCO-544392544',
  'DNBWebFamilyTree-CRC-653869396',
  'DNBWebFamilyTree-CRCC-654519800',
  'DNBWebFamilyTree-CSAH-529665481',
  'DNBWebFamilyTree-CSCEC-653714618',
  'DNBWebFamilyTree-CSCN-616548971',
  'DNBWebFamilyTree-CSG-544903503',
  'DNBWebFamilyTree-CTG-547744282',
  'DNBWebFamilyTree-DiDi-815557247',
  'DNBWebFamilyTree-Douyin-544582626',
  'DNBWebFamilyTree-Geely-545268208',
  'DNBWebFamilyTree-HWorld-864410444',
  'DNBWebFamilyTree-ICBC-653710657',
  'DNBWebFamilyTree-iFLYTEK-544747629',
  'DNBWebFamilyTree-JD-815553395',
  'DNBWebFamilyTree-JinJiang-544900814',
  'DNBWebFamilyTree-Kingsoft-421363413',
  'DNBWebFamilyTree-Kuaishou-420644923',
  'DNBWebFamilyTree-Mango-547876680',
  'DNBWebFamilyTree-Meituan-544523516',
  'DNBWebFamilyTree-Minmetals-654530880',
  'DNBWebFamilyTree-NetEase-544656606',
  'DNBWebFamilyTree-PDD-544332001',
  'DNBWebFamilyTree-PeoplesDaily-529229549',
  'DNBWebFamilyTree-PICC-654510387',
  'DNBWebFamilyTree-PingAn-654077502',
  'DNBWebFamilyTree-SF-545398935',
  'DNBWebFamilyTree-SGCC-544928435',
  'DNBWebFamilyTree-Sinochem-699489765',
  'DNBWebFamilyTree-Sinopec-654661636',
  'DNBWebFamilyTree-SPIC-545234341',
  'DNBWebFamilyTree-Tencent-544835283',
  'DNBWebFamilyTree-UnionPay-544940385',
  'DNBWebFamilyTree-Wangsu-548050511',
  'DNBWebFamilyTree-Xiaomi-421271154',
  'DNBWebFamilyTree-Xinhua-653726794',
  'DNBWebFamilyTree-YTO-544851660',
  'DNBWebFamilyTree-YUNDA-527054568',
  'DNBWebFamilyTree-ZTO-527891418',
];

// ============================================================
// 工具函数
// ============================================================
function log(msg) {
  const ts = new Date().toLocaleString('zh-CN', { hour12: false });
  console.log(`[${ts}] ${msg}`);
}

function runCmd(cmd, opts = {}) {
  log(`执行: ${cmd.substring(0, 120)}...`);
  return execSync(cmd, { stdio: 'inherit', ...opts });
}

function cleanup() {
  log('清理本地临时文件...');
  if (fs.existsSync(CONFIG.LOCAL_DUMP_DIR)) {
    execSync(`rm -rf "${CONFIG.LOCAL_DUMP_DIR}"`);
  }
}

// ============================================================
// 主流程
// ============================================================
async function main() {
  const startTime = Date.now();
  log('========================================');
  log('  MongoDB 数据同步脚本 开始执行');
  log(`  同步集合数量: ${COLLECTIONS_TO_SYNC.length}`);
  log('========================================\n');

  // 步骤 1：在本地逐个 dump 集合到临时目录
  log('【步骤 1/4】 在本地导出指定集合...');
  if (!fs.existsSync(CONFIG.LOCAL_DUMP_DIR)) {
    fs.mkdirSync(CONFIG.LOCAL_DUMP_DIR, { recursive: true });
  }

  for (const col of COLLECTIONS_TO_SYNC) {
    const cmd = [
      CONFIG.MONGODUMP_BIN,
      `--uri "${CONFIG.LOCAL_MONGODB}"`,
      `--db ${CONFIG.LOCAL_DB}`,
      `--collection "${col}"`,
      `--out "${CONFIG.LOCAL_DUMP_DIR}"`,
    ].join(' ');
    try {
      execSync(cmd, { stdio: ['ignore', 'ignore', 'pipe'] });
      log(`  ✅ 已导出: ${col}`);
    } catch (e) {
      log(`  ⚠️ 导出失败: ${col} — ${e.stderr?.toString().trim()}`);
    }
  }

  // 步骤 2：将 dump 目录 scp 传输到生产服务器
  log('\n【步骤 2/4】 传输 dump 文件到生产服务器...');
  const remoteSSH = `-p ${CONFIG.REMOTE_PORT} ${CONFIG.REMOTE_USER}@${CONFIG.REMOTE_HOST}`;
  const scpTarget = `${CONFIG.REMOTE_USER}@${CONFIG.REMOTE_HOST}:${CONFIG.REMOTE_TMP_DIR}`;

  // 先在服务器上创建临时目录
  execSync(`ssh -p ${CONFIG.REMOTE_PORT} ${CONFIG.REMOTE_USER}@${CONFIG.REMOTE_HOST} "mkdir -p ${CONFIG.REMOTE_TMP_DIR}"`, { stdio: 'inherit' });

  // 传输文件（递归）
  runCmd(`scp -P ${CONFIG.REMOTE_PORT} -r "${CONFIG.LOCAL_DUMP_DIR}/${CONFIG.LOCAL_DB}" "${scpTarget}/"`);
  log('  ✅ 传输完成');

  // 步骤 3：将 dump 文件复制进 Docker 容器，然后调用 mongorestore
  log('\n【步骤 3/4】 在服务器 Docker 容器中执行 mongorestore (--drop 模式)...');

  // 先在容器内创建临时目录
  const mkdirInContainer = `ssh -p ${CONFIG.REMOTE_PORT} ${CONFIG.REMOTE_USER}@${CONFIG.REMOTE_HOST} "docker exec ${CONFIG.REMOTE_MONGO_CONTAINER} mkdir -p ${CONFIG.CONTAINER_TMP_DIR}"`;
  execSync(mkdirInContainer, { stdio: 'inherit' });

  // 将宿主机 dump 目录 cp 进容器
  const dockerCpCmd = `ssh -p ${CONFIG.REMOTE_PORT} ${CONFIG.REMOTE_USER}@${CONFIG.REMOTE_HOST} "docker cp ${CONFIG.REMOTE_TMP_DIR}/${CONFIG.LOCAL_DB} ${CONFIG.REMOTE_MONGO_CONTAINER}:${CONFIG.CONTAINER_TMP_DIR}/"`;
  runCmd(dockerCpCmd);
  log('  ✅ 文件已复制进容器');

  // 在容器内执行 mongorestore
  const restoreCmd = [
    `mongorestore`,
    `--uri "${CONFIG.REMOTE_MONGODB}"`,
    `--db ${CONFIG.REMOTE_DB}`,
    `--drop`,
    `"${CONFIG.CONTAINER_TMP_DIR}/${CONFIG.LOCAL_DB}"`,
  ].join(' ');
  const dockerRestoreCmd = `ssh -p ${CONFIG.REMOTE_PORT} ${CONFIG.REMOTE_USER}@${CONFIG.REMOTE_HOST} "docker exec ${CONFIG.REMOTE_MONGO_CONTAINER} ${restoreCmd}"`;
  runCmd(dockerRestoreCmd);
  log('  ✅ 数据恢复完成');

  // 步骤 4：清理本地和服务器临时文件
  log('\n【步骤 4/4】 清理临时文件...');
  cleanup();
  // 清理服务器宿主机和容器内的临时文件
  execSync(`ssh -p ${CONFIG.REMOTE_PORT} ${CONFIG.REMOTE_USER}@${CONFIG.REMOTE_HOST} "rm -rf ${CONFIG.REMOTE_TMP_DIR} && docker exec ${CONFIG.REMOTE_MONGO_CONTAINER} rm -rf ${CONFIG.CONTAINER_TMP_DIR}"`, { stdio: 'inherit' });
  log('  ✅ 临时文件清理完成');

  const elapsed = Math.round((Date.now() - startTime) / 1000);
  log(`\n========================================`);
  log(`  ✅ 同步完成！耗时: ${elapsed} 秒`);
  log(`========================================`);
}

// 捕获异常，确保清理
main().catch(err => {
  console.error('\n❌ 同步过程中发生错误:', err.message);
  cleanup();
  process.exit(1);
});
