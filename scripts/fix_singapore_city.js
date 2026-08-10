process.env.NODE_ENV = process.env.NODE_ENV || 'development';
const mongoose = require('mongoose');
const config = require('../src/config/config');

async function fixSingaporeCity() {
  try {
    await mongoose.connect(config.mongoose.url, config.mongoose.options);
    console.log('成功连接到 MongoDB 数据库:', config.mongoose.url);

    const db = mongoose.connection.db;
    const collection = db.collection('keyGlobalFamilyTree');

    // 1. 使用不区分大小写正则查询 registeredCity 匹配 Singapore 的所有变体
    const cursor = collection.find({ registeredCity: { $regex: /singapore/i } });
    const allMatches = await cursor.toArray();
    console.log(`全表正则匹配 /singapore/i 的总文档数: ${allMatches.length}`);

    const distinctCities = Array.from(new Set(allMatches.map(doc => doc.registeredCity)));
    console.log('正则匹配到的去重 registeredCity 值:', distinctCities);

    // 把其中不是 "Singapore" 的全量更新为 "Singapore"
    const uppercaseCount = allMatches.filter(doc => doc.registeredCity !== 'Singapore').length;
    if (uppercaseCount > 0) {
      const result = await collection.updateMany(
        { registeredCity: { $regex: /^singapore$/i, $ne: 'Singapore' } },
        { $set: { registeredCity: 'Singapore' } }
      );
      console.log(`已成功修正 ${result.modifiedCount} 条非标准 "Singapore" 的记录为 "Singapore"!`);
    } else {
      console.log('数据校验完毕：全表中所有新加坡相关城市的字段值均为标准的 "Singapore"！');
    }

    await mongoose.disconnect();
    console.log('数据库连接已断开，修复流程顺利完成。');
  } catch (err) {
    console.error('修复 registeredCity SINGAPORE 失败:', err);
    process.exit(1);
  }
}

fixSingaporeCity();
