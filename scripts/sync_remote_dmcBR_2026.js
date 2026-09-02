/**
 * 远程服务器执行脚本：
 * 1. 删除服务端 dmcBR 表中 “数据月份” 以 2026 开头的所有历史记录；
 * 2. 流式解压并批量插入开发端导出的 dmcBR_2026.jsonl.gz (843,053 条)；
 * 3. 自动重新计算并刷新 keyCustomerOverviewSnapshot 快照。
 */
const fs = require('fs');
const zlib = require('zlib');
const readline = require('readline');
const mongoose = require('mongoose');

async function main() {
  const gzFile = '/home/tristan/workspaces/TristanSaas/dmcBR_2026.jsonl.gz';
  if (!fs.existsSync(gzFile)) {
    console.error('❌ 未找到数据压缩包:', gzFile);
    process.exit(1);
  }

  const startTotal = Date.now();
  console.log('=== 开始同步 dmcBR 2026 数据至服务端 ===');
  await mongoose.connect('mongodb://127.0.0.1:27017/node-boilerplate');
  const db = mongoose.connection.db;

  // 1. 统计当前待删除数量
  const countBefore = await db.collection('dmcBR').countDocuments({ '数据月份': { $regex: /^2026/ } });
  console.log(`[步骤 1] 服务端当前 2026 开头记录数: ${countBefore} 条`);

  // 2. 执行删除
  console.log('[步骤 2] 正在删除服务端 2026 开头的所有记录...');
  const delRes = await db.collection('dmcBR').deleteMany({ '数据月份': { $regex: /^2026/ } });
  console.log(`[步骤 2] 删除完成！成功删除: ${delRes.deletedCount} 条记录`);

  // 3. 流式解压并批量导入
  console.log('[步骤 3] 开始从 dmcBR_2026.jsonl.gz 批量导入最新记录...');
  const fileStream = fs.createReadStream(gzFile);
  const unzipStream = zlib.createGunzip();
  const rl = readline.createInterface({
    input: fileStream.pipe(unzipStream),
    crlfDelay: Infinity
  });

  const BATCH_SIZE = 3000;
  let batch = [];
  let insertedCount = 0;
  let tBatch = Date.now();

  for await (const line of rl) {
    if (!line.trim()) continue;
    const doc = JSON.parse(line);
    // 处理 _id (保证 BSON ObjectId 或 string 一致)
    if (doc._id && typeof doc._id === 'object' && doc._id.$oid) {
      doc._id = new mongoose.Types.ObjectId(doc._id.$oid);
    } else if (doc._id && typeof doc._id === 'string' && /^[0-9a-fA-F]{24}$/.test(doc._id)) {
      doc._id = new mongoose.Types.ObjectId(doc._id);
    }
    batch.push(doc);

    if (batch.length >= BATCH_SIZE) {
      await db.collection('dmcBR').insertMany(batch, { ordered: false });
      insertedCount += batch.length;
      batch = [];
      if (insertedCount % 100000 === 0) {
        console.log(`已导入 ${insertedCount} 条... (当前耗时: ${(Date.now() - tBatch) / 1000}s)`);
      }
    }
  }

  if (batch.length > 0) {
    await db.collection('dmcBR').insertMany(batch, { ordered: false });
    insertedCount += batch.length;
    batch = [];
  }

  console.log(`[步骤 3] 批量导入全部完成！总导入条数: ${insertedCount} 条 (耗时: ${((Date.now() - tBatch) / 1000).toFixed(1)}s)`);

  // 4. 验证校验最终数据
  const countAfter = await db.collection('dmcBR').countDocuments({ '数据月份': { $regex: /^2026/ } });
  console.log(`[步骤 4] 导入后服务端 2026 记录总数: ${countAfter} 条`);
  const monthlyDist = await db.collection('dmcBR').aggregate([
    { $match: { '数据月份': { $regex: /^2026/ } } },
    { $group: { _id: '$数据月份', count: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]).toArray();
  console.log('[步骤 4] 服务端最新 2026 月份分布:', monthlyDist);

  // 5. 自动刷新快照表
  console.log('[步骤 5] 正在重新计算并刷新 keyCustomerOverviewSnapshot 快照...');
  const { refreshOverviewSnapshot } = require('./src/controllers/keyCustomerOverview.controller');
  const payload = await refreshOverviewSnapshot(true);
  console.log('✅ 快照刷新完成！');
  console.log(`- 2026 B端计费总额: ${payload?.br2026Total_B}`);
  console.log(`- 2026 A端计费总额: ${payload?.br2026Total_A}`);

  console.log(`\n🎉 全流程同步与刷新成功！总耗时: ${((Date.now() - startTotal) / 1000).toFixed(1)}s`);
  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error('❌ 执行失败:', err);
  process.exit(1);
});
