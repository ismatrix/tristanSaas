const mongoose = require('mongoose');

async function updateManualMappings() {
  const mongoUrl = process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017/node-boilerplate';
  console.log(`📡 正在连接数据库: ${mongoUrl} ...`);
  await mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true });
  
  const db = mongoose.connection.db;
  const collection = db.collection('keyFamilyTreeCustMapping');

  // 查询 mappingPath: 'manual' 的记录
  const beforeCount = await collection.countDocuments({ mappingPath: 'manual' });
  console.log(`🔍 找到 mappingPath="manual" 的记录共 ${beforeCount} 条`);

  if (beforeCount > 0) {
    const result = await collection.updateMany(
      { mappingPath: 'manual' },
      {
        $set: {
          mappingPath: 'participant',
          method: 'manual'
        }
      }
    );
    console.log(`✅ 成功更新 ${result.modifiedCount} 条记录至 mappingPath="participant", method="manual"`);
  } else {
    console.log('ℹ️ 没有找到需要更新的 mappingPath="manual" 记录');
  }

  await mongoose.disconnect();
  console.log('👋 数据库连接已断开');
}

updateManualMappings().catch(err => {
  console.error('❌ 执行更新脚本失败:', err);
  process.exit(1);
});
