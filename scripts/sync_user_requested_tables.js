#!/usr/bin/env node
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const CONFIG = {
  LOCAL_MONGODB: 'mongodb://127.0.0.1:27017',
  LOCAL_DB: 'node-boilerplate',

  REMOTE_HOST: 'tristan.wang',
  REMOTE_PORT: 6822,
  REMOTE_USER: 'tristan',
  REMOTE_MONGODB: 'mongodb://127.0.0.1:27017',
  REMOTE_DB: 'node-boilerplate',
  REMOTE_MONGO_CONTAINER: 'mongodb',

  REMOTE_TMP_DIR: '/home/tristan/tmp_mongo_sync_requested',
  CONTAINER_TMP_DIR: '/tmp/mongo_sync_requested',
  LOCAL_DUMP_DIR: path.join(__dirname, '../tmp_mongo_dump_requested'),
  MONGODUMP_BIN: process.env.MONGODUMP_BIN || '/opt/homebrew/bin/mongodump',
};

const TARGET_COLLECTIONS = [
  'keycustomer',
  'keyGlobalFamilyTree',
  'keyFamilyTreeCustMapping'
];

function log(msg) {
  const ts = new Date().toLocaleString('zh-CN', { hour12: false });
  console.log(`[${ts}] ${msg}`);
}

function runCmd(cmd, opts = {}) {
  log(`执行: ${cmd.substring(0, 120)}...`);
  return execSync(cmd, { stdio: 'inherit', ...opts });
}

function cleanup() {
  log('清理本地临时导出文件...');
  if (fs.existsSync(CONFIG.LOCAL_DUMP_DIR)) {
    execSync(`rm -rf "${CONFIG.LOCAL_DUMP_DIR}"`);
  }
}

async function main() {
  const startTime = Date.now();
  log('========================================');
  log('  指定数据表同步开始 (3个表)');
  log('========================================\n');

  log(`📦 目标同步集合: ${TARGET_COLLECTIONS.join(', ')}`);

  // 1. 本地导出指定表
  log('\n【步骤 1/4】 本地 mongodump 导出...');
  if (!fs.existsSync(CONFIG.LOCAL_DUMP_DIR)) {
    fs.mkdirSync(CONFIG.LOCAL_DUMP_DIR, { recursive: true });
  }

  for (const col of TARGET_COLLECTIONS) {
    const cmd = [
      CONFIG.MONGODUMP_BIN,
      `--uri "${CONFIG.LOCAL_MONGODB}"`,
      `--db ${CONFIG.LOCAL_DB}`,
      `--collection "${col}"`,
      `--out "${CONFIG.LOCAL_DUMP_DIR}"`,
    ].join(' ');
    try {
      execSync(cmd, { stdio: ['ignore', 'ignore', 'pipe'] });
      log(`  ✅ 已成功导出: ${col}`);
    } catch (e) {
      log(`  ⚠️ 导出警告/失败: ${col} — ${e.stderr?.toString().trim()}`);
    }
  }

  // 2. SCP 传输至生产服务器
  log('\n【步骤 2/4】 SCP 传输数据包至生产服务器 tristan@tristan.wang:6822...');
  const scpTarget = `${CONFIG.REMOTE_USER}@${CONFIG.REMOTE_HOST}:${CONFIG.REMOTE_TMP_DIR}`;

  execSync(`ssh -p ${CONFIG.REMOTE_PORT} ${CONFIG.REMOTE_USER}@${CONFIG.REMOTE_HOST} "mkdir -p ${CONFIG.REMOTE_TMP_DIR}"`, { stdio: 'inherit' });
  runCmd(`scp -P ${CONFIG.REMOTE_PORT} -r "${CONFIG.LOCAL_DUMP_DIR}/${CONFIG.LOCAL_DB}" "${scpTarget}/"`);
  log('  ✅ 传输完成');

  // 3. 复制进 Docker 容器并执行 mongorestore
  log('\n【步骤 3/4】 服务器 Docker 容器内执行 mongorestore (--drop 模式)...');
  execSync(`ssh -p ${CONFIG.REMOTE_PORT} ${CONFIG.REMOTE_USER}@${CONFIG.REMOTE_HOST} "docker exec ${CONFIG.REMOTE_MONGO_CONTAINER} mkdir -p ${CONFIG.CONTAINER_TMP_DIR}"`, { stdio: 'inherit' });
  
  const dockerCpCmd = `ssh -p ${CONFIG.REMOTE_PORT} ${CONFIG.REMOTE_USER}@${CONFIG.REMOTE_HOST} "docker cp ${CONFIG.REMOTE_TMP_DIR}/${CONFIG.LOCAL_DB} ${CONFIG.REMOTE_MONGO_CONTAINER}:${CONFIG.CONTAINER_TMP_DIR}/"`;
  runCmd(dockerCpCmd);

  const restoreCmd = [
    `mongorestore`,
    `--uri "${CONFIG.REMOTE_MONGODB}"`,
    `--db ${CONFIG.REMOTE_DB}`,
    `--drop`,
    `"${CONFIG.CONTAINER_TMP_DIR}/${CONFIG.LOCAL_DB}"`,
  ].join(' ');
  const dockerRestoreCmd = `ssh -p ${CONFIG.REMOTE_PORT} ${CONFIG.REMOTE_USER}@${CONFIG.REMOTE_HOST} "docker exec ${CONFIG.REMOTE_MONGO_CONTAINER} ${restoreCmd}"`;
  runCmd(dockerRestoreCmd);
  log('  ✅ 生产端数据恢复完成！');

  // 4. 清理
  log('\n【步骤 4/4】 清理临时文件...');
  cleanup();
  execSync(`ssh -p ${CONFIG.REMOTE_PORT} ${CONFIG.REMOTE_USER}@${CONFIG.REMOTE_HOST} "rm -rf ${CONFIG.REMOTE_TMP_DIR} && docker exec ${CONFIG.REMOTE_MONGO_CONTAINER} rm -rf ${CONFIG.CONTAINER_TMP_DIR}"`, { stdio: 'inherit' });
  log('  ✅ 临时文件清理完成');

  const elapsed = Math.round((Date.now() - startTime) / 1000);
  log(`\n========================================`);
  log(`  🎉 3 个指定数据表同步全量完成！耗时: ${elapsed} 秒`);
  log(`========================================`);
}

main().catch(err => {
  console.error('\n❌ 同步过程中发生错误:', err.message);
  cleanup();
  process.exit(1);
});
