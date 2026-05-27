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
// 自动动态获取需要同步的集合列表
// ============================================================
let COLLECTIONS_TO_SYNC = [];

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
  log('========================================\n');

  // 连接本地数据库以动态扫描集合
  log('【步骤 0/4】 动态扫描开发端集合...');
  const mongoose = require('mongoose');
  try {
    await mongoose.connect(`${CONFIG.LOCAL_MONGODB}/${CONFIG.LOCAL_DB}`, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    const db = mongoose.connection.db;
    const cols = await db.listCollections().toArray();
    const allNames = cols.map(c => c.name);
    
    // 动态筛选出需要同步的数据集
    COLLECTIONS_TO_SYNC = allNames.filter(name => {
      return name === 'keyGlobalFamilyTree' ||
             name === 'dnbCompanyDetail' ||
             name.startsWith('DNBFamilyTree-') ||
             name.startsWith('DNBWebFamilyTree-');
    }).sort();
    
    log(`  ✅ 动态扫描完成，共找到 ${COLLECTIONS_TO_SYNC.length} 个目标同步集合`);
    log(`  📦 待同步集合列表: ${COLLECTIONS_TO_SYNC.join(', ')}\n`);
  } catch (err) {
    log(`  ❌ 动态扫描本地集合失败: ${err.message}`);
    throw err;
  } finally {
    await mongoose.disconnect();
  }

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
