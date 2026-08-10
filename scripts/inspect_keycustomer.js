require('dotenv').config();
const mongoose = require('mongoose');

async function inspectKeyCustomer() {
  const mongoUrl = process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017/node-boilerplate';
  await mongoose.connect(mongoUrl, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const db = mongoose.connection.db;
  const collection = db.collection('keycustomer');

  const docs = await collection.find({}).toArray();
  console.log(`keycustomer 表总文档数: ${docs.length}`);
  if (docs.length > 0) {
    console.log('第一条文档的字段:', Object.keys(docs[0]));
    console.log('第一条文档示例:', JSON.stringify(docs[0], null, 2));
  }

  // 测试查一条 PID = '302007032600089626' 或 GID = '302007032600089626'
  const targetId = '302007032600089626';
  const byPid = await collection.findOne({ PID: targetId });
  const byGid = await collection.findOne({ GID: targetId });
  const byPidLower = await collection.findOne({ pid: targetId });
  const byGidLower = await collection.findOne({ gid: targetId });

  console.log(`查询 ${targetId} 结果:`);
  console.log('by PID:', byPid ? `找到 (_id: ${byPid._id}, nameCn: ${byPid.nameCn}, PID: ${byPid.PID}, GID: ${byPid.GID})` : '未找到');
  console.log('by GID:', byGid ? `找到 (_id: ${byGid._id}, nameCn: ${byGid.nameCn}, PID: ${byGid.PID}, GID: ${byGid.GID})` : '未找到');
  console.log('by pid:', byPidLower ? '找到' : '未找到');
  console.log('by gid:', byGidLower ? '找到' : '未找到');

  await mongoose.disconnect();
}

inspectKeyCustomer().catch(err => {
  console.error(err);
  process.exit(1);
});
