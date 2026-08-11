const { MongoClient } = require('mongodb');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const LOCAL_MONGO_URL = 'mongodb://127.0.0.1:27017/node-boilerplate';
const REMOTE_HOST = 'tristan.wang';
const REMOTE_PORT = 6822;
const REMOTE_USER = 'tristan';
const REMOTE_TMP_DIR = '/home/tristan/tmp_mongo_sync';

async function main() {
  console.log('===================================================');
  console.log('  开发端 MongoDB 数据库索引同步到服务器端 开始执行');
  console.log('===================================================\n');

  // 1. 本地提取所有集合的索引定义
  console.log('【步骤 1/4】 正在扫描开发端 MongoDB 所有集合的索引定义...');
  const localClient = await MongoClient.connect(LOCAL_MONGO_URL, { useUnifiedTopology: true });
  const localDb = localClient.db();
  const collections = await localDb.listCollections().toArray();

  const indexMap = {};
  let totalCustomIndexes = 0;

  for (const colInfo of collections) {
    const colName = colInfo.name;
    if (colName.startsWith('system.')) continue;

    const indexes = await localDb.collection(colName).indexes();
    const customIndexes = indexes.filter(idx => idx.name !== '_id_').map(idx => {
      const { v, ns, ...options } = idx;
      return {
        key: idx.key,
        options
      };
    });

    if (customIndexes.length > 0) {
      indexMap[colName] = customIndexes;
      totalCustomIndexes += customIndexes.length;
    }
  }
  await localClient.close();

  console.log(`  ✅ 开发端扫描完成：共计 ${Object.keys(indexMap).length} 个集合包含 ${totalCustomIndexes} 个自定义索引。\n`);

  // 2. 将索引 Mapping 保存至临时文件并传输到生产服务器
  console.log('【步骤 2/4】 正在传输索引定义配置与脚本至生产服务器...');
  const tmpJsonPath = path.join(__dirname, 'all_indexes.json');
  const remoteScriptPath = path.join(__dirname, 'remote_apply_indexes.js');

  fs.writeFileSync(tmpJsonPath, JSON.stringify(indexMap, null, 2), 'utf-8');

  // 传输配置文件与处理脚本至服务器宿主机
  execSync(`ssh -p ${REMOTE_PORT} ${REMOTE_USER}@${REMOTE_HOST} "mkdir -p ${REMOTE_TMP_DIR}"`, { stdio: 'inherit' });
  execSync(`scp -P ${REMOTE_PORT} "${tmpJsonPath}" "${remoteScriptPath}" ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_TMP_DIR}/`, { stdio: 'inherit' });

  // 清理本地临时 JSON 文件
  if (fs.existsSync(tmpJsonPath)) {
    fs.unlinkSync(tmpJsonPath);
  }

  console.log('  ✅ 索引定义文件及脚本已成功传输至服务器。\n');

  // 3. 在服务器端项目 Node 环境下运行索引创建
  console.log('【步骤 3/4】 在生产服务器端执行索引构建同步...');
  const runRemoteCmd = `ssh -p ${REMOTE_PORT} ${REMOTE_USER}@${REMOTE_HOST} "NODE_PATH=/home/tristan/workspaces/TristanSaas/node_modules NODE_ENV=development node ${REMOTE_TMP_DIR}/remote_apply_indexes.js"`;
  execSync(runRemoteCmd, { stdio: 'inherit' });

  // 4. 清理服务器临时文件
  console.log('【步骤 4/4】 清理服务器临时文件...');
  execSync(`ssh -p ${REMOTE_PORT} ${REMOTE_USER}@${REMOTE_HOST} "rm -rf ${REMOTE_TMP_DIR}"`, { stdio: 'inherit' });

  console.log('\n===================================================');
  console.log('  ✅ 开发环境下所有表/集合的索引已 100% 在服务器端建立完毕！');
  console.log('===================================================\n');
}

main().catch(err => {
  console.error('❌ 同步索引失败:', err);
  process.exit(1);
});
