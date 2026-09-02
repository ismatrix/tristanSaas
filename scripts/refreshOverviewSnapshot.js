/**
 * 刷新「要客概览」持久化快照脚本
 * 用途：当底层表（如 dmcBR、dmcTCV、keycustomer 等）更新后，运行此脚本即可全量重新计算并更新 keyCustomerOverviewSnapshot 集合。
 * 运行方式：
 *   本地环境：node scripts/refreshOverviewSnapshot.js
 *   生产环境：node scripts/refreshOverviewSnapshot.js
 */
process.env.NODE_ENV = process.env.NODE_ENV || 'production';
require('dotenv').config();
const mongoose = require('mongoose');
const config = require('../src/config/config');
const { refreshOverviewSnapshot } = require('../src/controllers/keyCustomerOverview.controller');

async function main() {
  console.log('=== 开始刷新 keyCustomerOverviewSnapshot 快照 ===');
  console.log('连接数据库:', config.mongoose.url);
  
  await mongoose.connect(config.mongoose.url, config.mongoose.options);
  console.log('MongoDB 连接成功');

  const start = Date.now();
  console.log('正在执行全量统计计算 (包括 8大行业、历年月度TCV/BR、A端/B端收入聚合)...');
  
  const payload = await refreshOverviewSnapshot(true);
  const duration = Date.now() - start;

  console.log('\n✅ 快照刷新成功！');
  console.log(`- 计算总耗时: ${duration} ms`);
  console.log(`- 要客总数: ${payload?.quantity?.totalCustomers}`);
  console.log(`- 渗透客户数: ${payload?.quantity?.penetratedCustomersCount} (${payload?.quantity?.customerPenetrationRate})`);
  console.log(`- 分支总数: ${payload?.quantity?.totalBranches}`);
  console.log(`- 2026 B端签单总额: ${payload?.tcv2026Total_B}`);
  console.log(`- 2026 A端签单总额: ${payload?.tcv2026Total_A}`);
  console.log(`- 2026 B端计费总额: ${payload?.br2026Total_B}`);
  console.log(`- 2026 A端计费总额: ${payload?.br2026Total_A}`);
  console.log(`- 快照集合: keyCustomerOverviewSnapshot (_id: "latest_overview_stats")`);

  await mongoose.disconnect();
  console.log('数据库已断开，操作完成。');
  process.exit(0);
}

main().catch(err => {
  console.error('❌ 刷新快照失败:', err);
  process.exit(1);
});
