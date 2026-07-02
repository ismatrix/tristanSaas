const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/node-boilerplate');
  const db = mongoose.connection.db;

  const keyCustomers = await db.collection('keycustomer').find({}, { projection: { GID: 1, nameCn: 1 } }).toArray();
  const gidToCustomerNameMap = new Map();
  keyCustomers.forEach(cust => {
    if (cust.GID) {
      gidToCustomerNameMap.set(String(cust.GID).trim(), cust.nameCn || '未命名要客');
    }
  });

  const mappings = await db.collection('keyFamilyTreeCustMapping').find({}, { projection: { extCustId: 1, ultimateGID: 1 } }).toArray();
  const extCustIdToGidMap = new Map();
  const extCustIds = new Set();
  mappings.forEach(m => {
    if (m.extCustId) {
      const extId = String(m.extCustId).trim();
      extCustIdToGidMap.set(extId, m.ultimateGID ? String(m.ultimateGID).trim() : '');
      extCustIds.add(extId);
    }
  });

  const tcvRecords = await db.collection('dmcTCV').find(
    { '签约客户标识': { $in: Array.from(extCustIds) } },
    { projection: { '签约客户标识': 1, '合同签署日期': 1, '设置起租日期': 1, '电路编号': 1, '订单状态': 1, '签单金额(港币)': 1 } }
  ).toArray();

  // 过滤 Achive
  let filteredTcv = tcvRecords.filter(rec => {
    const status = String(rec['订单状态'] || '').trim();
    return status.toLowerCase() !== 'achive';
  });

  // 按 _id 排序
  filteredTcv.sort((a, b) => String(a._id).localeCompare(String(b._id)));

  // 去重
  const uniqueTcvMap = new Map();
  filteredTcv.forEach(rec => {
    const kSignDate = rec['合同签署日期'] !== undefined && rec['合同签署日期'] !== null ? String(rec['合同签署日期']).trim() : '';
    const kStartDate = rec['设置起租日期'] !== undefined && rec['设置起租日期'] !== null ? String(rec['设置起租日期']).trim() : '';
    const kCircuit = rec['电路编号'] !== undefined && rec['电路编号'] !== null ? String(rec['电路编号']).trim() : '';
    const kStatus = rec['订单状态'] !== undefined && rec['订单状态'] !== null ? String(rec['订单状态']).trim() : '';
    const kAmount = rec['签单金额(港币)'] !== undefined && rec['签单金额(港币)'] !== null ? String(rec['签单金额(港币)']).trim() : '';
    
    const duplicateKey = `${kSignDate}_${kStartDate}_${kCircuit}_${kStatus}_${kAmount}`;
    if (!uniqueTcvMap.has(duplicateKey)) {
      uniqueTcvMap.set(duplicateKey, rec);
    }
  });
  const finalTcvRecords = Array.from(uniqueTcvMap.values());

  const tcvCustomerSumMap = {};
  finalTcvRecords.forEach(rec => {
    const extId = String(rec['签约客户标识'] || '').trim();
    const parentGid = extCustIdToGidMap.get(extId);
    const customerName = parentGid ? (gidToCustomerNameMap.get(parentGid) || '未知客户') : '未知客户';

    const signDate = rec['合同签署日期'] || '';
    const year = signDate.substring(0, 4);
    if (['2023', '2024', '2025', '2026'].includes(year)) {
      const amount = parseFloat(rec['签单金额(港币)'] || 0);
      const key = `${year}_${customerName}`;
      tcvCustomerSumMap[key] = (tcvCustomerSumMap[key] || 0) + amount;
    }
  });

  const tcvCustomerStats = Object.keys(tcvCustomerSumMap).map(k => {
    const [year, customerName] = k.split('_');
    return {
      year,
      customerName,
      amount: tcvCustomerSumMap[k]
    };
  });

  // 打印 2026 年签单大盘 Top 5
  console.log('\n=== 大盘返回的 2026 签单排行 Top 5 ===');
  const top5 = tcvCustomerStats
    .filter(r => r.year === '2026')
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);
  top5.forEach((r, idx) => {
    console.log(`${idx + 1}. 客户: ${r.customerName}, 金额: ${r.amount} HKD`);
  });

  await mongoose.disconnect();
}

run();
