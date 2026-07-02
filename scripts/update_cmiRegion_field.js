require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

async function runUpdate() {
  const startTime = Date.now();
  console.log('==================================================');
  console.log('  cmiRegion 字段批量更新刷数脚本开始运行');
  console.log('==================================================\n');

  let connection = null;
  try {
    // 1. 读取国家到区域映射的 JSON 文件
    const mapPath = path.join(__dirname, 'cmi_region_map.json');
    if (!fs.existsSync(mapPath)) {
      throw new Error(`映射配置文件不存在: ${mapPath}`);
    }
    const regionMap = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
    console.log(`✅ 成功加载映射字典，共包含 ${Object.keys(regionMap).length} 个国家映射。`);

    // 2. 连接本地 MongoDB
    const mongoUrl = process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017/node-boilerplate';
    console.log(`正在连接数据库: ${mongoUrl}`);
    connection = await mongoose.connect(mongoUrl, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB 连接成功！');

    const db = mongoose.connection.db;
    const collectionName = 'keyGlobalFamilyTree';
    const collection = db.collection(collectionName);

    // 3. 获取所有记录
    console.log(`正在查询集合 [${collectionName}] 内的所有文档...`);
    const docs = await collection.find({}, { projection: { _id: 1, registeredCountry: 1, position: 1 } }).toArray();
    console.log(`📊 集合中共有 ${docs.length} 条文档记录。`);

    if (docs.length === 0) {
      console.log('⚠️ 集合内没有任何记录，无需更新。');
      return;
    }

    // 4. 组装批量更新操作
    const bulkOps = [];
    let matchedCount = 0;
    let unmatchedCount = 0;
    const unmatchedCountries = new Set();

    for (const doc of docs) {
      // 优先获取 registeredCountry，若无则获取 position 作为降级方案
      const rawCountry = doc.registeredCountry || doc.position || '';
      const countryCleaned = String(rawCountry).trim();

      let targetRegion = null;
      if (countryCleaned) {
        const countryKey = countryCleaned.toLowerCase();
        if (regionMap[countryKey] !== undefined) {
          targetRegion = regionMap[countryKey];
          matchedCount++;
        } else {
          unmatchedCount++;
          unmatchedCountries.add(countryCleaned);
        }
      } else {
        unmatchedCount++;
      }

      bulkOps.push({
        updateOne: {
          filter: { _id: doc._id },
          update: { $set: { cmiRegion: targetRegion } }
        }
      });
    }

    console.log(`\n分析完成：`);
    console.log(` - 成功匹配到区域的记录数: ${matchedCount}`);
    console.log(` - 未匹配到区域的记录数: ${unmatchedCount}`);
    if (unmatchedCountries.size > 0) {
      console.log(` - 未能匹配的国家列表 (前10个):`, Array.from(unmatchedCountries).slice(0, 10));
    }

    // 5. 执行 bulkWrite 批量更新
    if (bulkOps.length > 0) {
      console.log('\n正在将更新写入数据库 (批量执行中)...');
      const result = await collection.bulkWrite(bulkOps);
      console.log(`✅ 批量更新执行成功！`);
      console.log(` - 匹配到的文档数 (bulkWrite): ${result.matchedCount}`);
      console.log(` - 修改的文档数 (bulkWrite): ${result.modifiedCount}`);
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('\n==================================================');
    console.log(`  🎉 刷数执行完毕！总耗时: ${elapsed} 秒`);
    console.log('==================================================');

  } catch (err) {
    console.error('\n❌ 刷数过程中发生错误:', err);
  } finally {
    if (connection) {
      await mongoose.disconnect();
      console.log('\n数据库连接已关闭。');
    }
  }
}

runUpdate();
