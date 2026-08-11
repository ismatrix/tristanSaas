const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

const mongoUrl = 'mongodb://127.0.0.1:27017/node-boilerplate';
const jsonPath = path.join(__dirname, 'all_indexes.json');

async function applyIndexes() {
  console.log('========================================');
  console.log('  生产服务器全量数据库索引同步 开始执行');
  console.log('========================================\n');

  if (!fs.existsSync(jsonPath)) {
    console.error('❌ 未找到索引定义配置文件 all_indexes.json');
    process.exit(1);
  }

  const indexMap = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  const client = await MongoClient.connect(mongoUrl, { useUnifiedTopology: true });
  const db = client.db();

  let successCount = 0;
  let failCount = 0;

  for (const [colName, indexList] of Object.entries(indexMap)) {
    console.log(`正在处理集合 [${colName}] (${indexList.length} 个自定义索引)...`);
    const collection = db.collection(colName);
    for (const idxSpec of indexList) {
      try {
        const idxName = await collection.createIndex(idxSpec.key, idxSpec.options);
        console.log(`  ✅ 建立/更新索引成功: ${idxName}`);
        successCount++;
      } catch (err) {
        console.error(`  ❌ 建立索引失败 (${idxSpec.options?.name || JSON.stringify(idxSpec.key)}): ${err.message}`);
        failCount++;
      }
    }
  }

  console.log(`\n========================================`);
  console.log(`  ✅ 生产服务器索引同步完成: 成功 ${successCount} 个, 失败 ${failCount} 个`);
  console.log(`========================================\n`);

  await client.close();
}

applyIndexes().catch(err => {
  console.error('❌ 同步索引发生错误:', err);
  process.exit(1);
});
