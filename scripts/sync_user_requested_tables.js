#!/usr/bin/env node
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const CONFIG = {
  LOCAL_MONGODB: 'mongodb://127.0.0.1:27017',
  LOCAL_DB: 'node-boilerplate',

  REMOTE_HOST: 'tristan.wang',
  REMOTE_PORT: 6022,
  REMOTE_USER: 'tristan',
  REMOTE_DB: 'node-boilerplate',

  REMOTE_TMP_DIR: '/Users/tristan/tmp_mongo_sync_requested',
  LOCAL_DUMP_DIR: path.join(__dirname, '../tmp_mongo_dump_requested'),
  LOCAL_TAR_FILE: path.join(__dirname, '../tmp_mongo_dump_requested.tar.gz'),
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
  log(`执行: ${cmd.substring(0, 140)}...`);
  return execSync(cmd, { stdio: 'inherit', ...opts });
}

function cleanupLocal() {
  log('清理本地临时导出文件...');
  if (fs.existsSync(CONFIG.LOCAL_DUMP_DIR)) {
    execSync(`rm -rf "${CONFIG.LOCAL_DUMP_DIR}"`);
  }
  if (fs.existsSync(CONFIG.LOCAL_TAR_FILE)) {
    execSync(`rm -f "${CONFIG.LOCAL_TAR_FILE}"`);
  }
}

async function main() {
  const startTime = Date.now();
  log('====================================================');
  log('  数据表同步到生产环境 (ssh -p 6022 tristan@tristan.wang)');
  log('====================================================\n');

  log(`📦 目标同步集合: ${TARGET_COLLECTIONS.join(', ')}`);

  try {
    // 1. 本地导出指定表
    log('\n【步骤 1/4】 本地 mongodump 导出...');
    if (!fs.existsSync(CONFIG.LOCAL_DUMP_DIR)) {
      fs.mkdirSync(CONFIG.LOCAL_DUMP_DIR, { recursive: true });
    }

    for (const col of TARGET_COLLECTIONS) {
      log(`  - 导出集合: ${col}`);
      runCmd(
        `"${CONFIG.MONGODUMP_BIN}" --uri="${CONFIG.LOCAL_MONGODB}" --db="${CONFIG.LOCAL_DB}" --collection="${col}" --out="${CONFIG.LOCAL_DUMP_DIR}"`
      );
    }

    // 2. 本地打包压缩
    log('\n【步骤 2/4】 本地打包压缩导出文件...');
    runCmd(`tar -czf "${CONFIG.LOCAL_TAR_FILE}" -C "${CONFIG.LOCAL_DUMP_DIR}" .`);

    // 3. 上传压缩包到生产服务器
    log('\n【步骤 3/4】 SCP 上传压缩包到生产服务器...');
    runCmd(
      `ssh -p ${CONFIG.REMOTE_PORT} ${CONFIG.REMOTE_USER}@${CONFIG.REMOTE_HOST} "mkdir -p ${CONFIG.REMOTE_TMP_DIR}"`
    );
    runCmd(
      `scp -P ${CONFIG.REMOTE_PORT} "${CONFIG.LOCAL_TAR_FILE}" ${CONFIG.REMOTE_USER}@${CONFIG.REMOTE_HOST}:${CONFIG.REMOTE_TMP_DIR}/dump.tar.gz`
    );

    // 4. 远程解压并使用 mongorestore 恢复数据
    log('\n【步骤 4/4】 远程解压并使用 mongorestore --drop 还原数据...');
    const remoteCommands = [
      `mkdir -p ${CONFIG.REMOTE_TMP_DIR}/extracted`,
      `tar -xzf ${CONFIG.REMOTE_TMP_DIR}/dump.tar.gz -C ${CONFIG.REMOTE_TMP_DIR}/extracted`,
      `/opt/homebrew/bin/mongorestore --drop --db ${CONFIG.REMOTE_DB} ${CONFIG.REMOTE_TMP_DIR}/extracted/${CONFIG.LOCAL_DB}`,
      `rm -rf ${CONFIG.REMOTE_TMP_DIR}`,
    ].join(' && ');

    runCmd(
      `ssh -p ${CONFIG.REMOTE_PORT} ${CONFIG.REMOTE_USER}@${CONFIG.REMOTE_HOST} "${remoteCommands}"`
    );

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    log(`\n🎉 同步成功完成！总耗时: ${elapsed} 秒`);
  } catch (err) {
    log(`\n❌ 同步过程中发生错误: ${err.message}`);
    process.exit(1);
  } finally {
    cleanupLocal();
  }
}

main();
