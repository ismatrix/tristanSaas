require('dotenv').config();
const mongoose = require('mongoose');

async function getStats() {
  const url = process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017/node-boilerplate';
  await mongoose.connect(url, { useNewUrlParser: true, useUnifiedTopology: true });
  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();
  
  const results = [];
  for (const col of collections) {
    const name = col.name;
    // 跳过 MongoDB 内置系统集合
    if (name.startsWith('system.')) continue;
    
    try {
      const count = await db.collection(name).countDocuments();
      const stats = await db.command({ collStats: name });
      results.push({
        name,
        count,
        size: stats.size || 0,
        storageSize: stats.storageSize || 0
      });
    } catch (e) {
      // 某些可能无权限或空的集合做容错处理
      results.push({
        name,
        count: 0,
        size: 0,
        storageSize: 0,
        error: e.message
      });
    }
  }
  
  console.log(JSON.stringify(results));
  await mongoose.disconnect();
}

getStats().catch(err => {
  console.error(err);
  process.exit(1);
});
