const http = require('http');

async function test() {
  const postData = JSON.stringify({ email: 'admin@example.com', password: 'password1' }); // 或者默认账户
  // 模拟直接调用控制器测试
  const mongoose = require('mongoose');
  const config = require('../src/config/config');
  await mongoose.connect(config.mongoose.url, config.mongoose.options);
  const db = mongoose.connection.db;

  const count = await db.collection('keyGlobalFamilyTree').countDocuments();
  console.log('Direct DB count:', count);
  await mongoose.disconnect();
}

test().catch(console.error);
