const mongoose = require('mongoose');

const COLLECTIONS_TO_SYNC = [
  'keyGlobalFamilyTree',
  'keyFamilyTreeCustMapping',
  'keycustomer',
  'dmcBR',
  'dmcTCV',
  'contracts',
  'contractdetails',
  'orders',
  'orderdetails'
];

async function sync() {
  const localUrl = 'mongodb://127.0.0.1:27017/node-boilerplate';
  const prodUrl = 'mongodb://127.0.0.1:27018/node-boilerplate'; // 通过 SSH 隧道映射

  console.log('正在连接本地 MongoDB...');
  const localConn = await mongoose.createConnection(localUrl, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('本地 MongoDB 连接成功。');

  console.log('正在连接生产 MongoDB (通过端口 27018 隧道)...');
  const prodConn = await mongoose.createConnection(prodUrl, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('生产 MongoDB 连接成功。');

  const localDb = localConn.db;
  const prodDb = prodConn.db;

  for (const colName of COLLECTIONS_TO_SYNC) {
    console.log(`\n========================================`);
    console.log(`开始同步集合: [${colName}]`);
    
    // 获取本地和生产的总文档数
    const localCount = await localDb.collection(colName).countDocuments();
    console.log(`本地记录数: ${localCount}`);

    console.log(`正在清空生产环境的集合 [${colName}]...`);
    const delRes = await prodDb.collection(colName).deleteMany({});
    console.log(`成功删除生产环境的已有记录共 ${delRes.deletedCount} 条。`);

    if (localCount === 0) {
      console.log(`本地记录为 0，跳过数据导入。`);
      continue;
    }

    console.log(`正在从本地读取数据并流式写入生产环境...`);
    const cursor = localDb.collection(colName).find();
    let batch = [];
    const BATCH_SIZE = 10000; // 设定分批大小
    let insertedCount = 0;

    while (await cursor.hasNext()) {
      const doc = await cursor.next();
      batch.push(doc);
      
      if (batch.length >= BATCH_SIZE) {
        await prodDb.collection(colName).insertMany(batch);
        insertedCount += batch.length;
        console.log(`已成功同步并写入生产: ${insertedCount} / ${localCount} 条记录...`);
        batch = [];
      }
    }

    if (batch.length > 0) {
      await prodDb.collection(colName).insertMany(batch);
      insertedCount += batch.length;
      console.log(`已成功同步并写入生产: ${insertedCount} / ${localCount} 条记录...`);
    }

    console.log(`集合 [${colName}] 同步完成，共写入 ${insertedCount} 条记录。`);
  }

  console.log('\n所有指定的表同步任务全部顺利结束！正在断开数据库连接...');
  await localConn.close();
  await prodConn.close();
  console.log('数据库连接已安全关闭。');
}

sync().catch(err => {
  console.error('同步过程中发生致命错误:', err);
  process.exit(1);
});
