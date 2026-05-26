const mongoose = require('mongoose');
require('dotenv').config();

const mongoUrl = process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017/node-boilerplate';

async function main() {
  console.log('正在连接本地 MongoDB...');
  await mongoose.connect(mongoUrl, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log('MongoDB 连接成功。');

  const db = mongoose.connection.db;

  // 1. 获取所有以 DNBWebFamilyTree 开头的集合名称
  const collections = await db.listCollections().toArray();
  const targetCols = collections
    .map(c => c.name)
    .filter(name => name.startsWith('DNBWebFamilyTree'));

  console.log(`共发现 ${targetCols.length} 个以 DNBWebFamilyTree 开头的集合。`);

  let updatedCollectionsCount = 0;

  for (const colName of targetCols) {
    console.log(`正在更新集合: ${colName}...`);
    try {
      // 2. 批量将 fields.company_dunsNumber 的值赋值给顶层字段 company_dunsNumber
      // 使用聚合管道更新：只在 fields.company_dunsNumber 存在时才进行赋值更新，以避免生成不必要的 null 属性
      const result = await db.collection(colName).updateMany(
        { "fields.company_dunsNumber": { $exists: true } },
        [
          {
            $set: {
              company_dunsNumber: "$fields.company_dunsNumber"
            }
          }
        ]
      );
      
      console.log(`[成功] 集合 ${colName} 更新完成。匹配记录数: ${result.matchedCount}, 修改记录数: ${result.modifiedCount}`);
      updatedCollectionsCount++;
    } catch (err) {
      console.error(`[异常] 更新集合 ${colName} 时发生错误:`, err.message);
    }
  }

  console.log(`\n全部更新操作完成！共成功处理了 ${updatedCollectionsCount} 个集合。`);
  await mongoose.disconnect();
}

main().catch(err => {
  console.error('全局运行异常:', err);
  process.exit(1);
});
