const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const MONGODB_URL = process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017/node-boilerplate';

const INDUSTRY_NAME_MAP = {
  'Automotive': '汽车',
  'Energy': '能源',
  'Engineering and Construction': '住建',
  'Finance': '金融',
  'Industrial Manufacturing': '制造',
  'Retail Chain and Public Services': '连锁商业与公共服务',
  'Technology and Internet': '互联网/科技',
  'Transportation and Logistics': '交通与物流'
};

function calcYoY(v2026, v2025) {
  if (!v2025 || v2025 === 0) {
    return v2026 > 0 ? '+100.00%' : '0.00%';
  }
  const rate = ((v2026 - v2025) / v2025) * 100;
  const sign = rate > 0 ? '+' : '';
  return `${sign}${rate.toFixed(2)}%`;
}

async function run() {
  await mongoose.connect(MONGODB_URL, { useNewUrlParser: true, useUnifiedTopology: true });
  const db = mongoose.connection.db;

  const keyCustomers = await db.collection('keycustomer').find({}, { projection: { GID: 1, industryCode: 1, nameCn: 1 } }).toArray();
  const gidToIndustryMap = new Map();
  const gidToCustomerNameMap = new Map();

  keyCustomers.forEach(cust => {
    if (cust.GID) {
      const gidStr = String(cust.GID).trim();
      gidToIndustryMap.set(gidStr, cust.industryCode || 'Other');
      gidToCustomerNameMap.set(gidStr, cust.nameCn || '未命名要客');
    }
  });

  const mappings = await db.collection('keyFamilyTreeCustMapping').find({}, { projection: { GID: 1, extCustId: 1, ultimateGID: 1, mappingPath: 1 } }).toArray();
  const extCustIdToGidMap = new Map();
  const extCustIds = new Set();
  const endCustExtIdToGidMap = new Map();
  const endCustExtIds = new Set();

  mappings.forEach(m => {
    if (m.extCustId) {
      const extId = String(m.extCustId).trim();
      const gidStr = m.ultimateGID ? String(m.ultimateGID).trim() : '';
      extCustIdToGidMap.set(extId, gidStr);
      extCustIds.add(extId);
      if (m.mappingPath === 'endCustomer') {
        endCustExtIdToGidMap.set(extId, gidStr);
        endCustExtIds.add(extId);
      }
    }
  });

  const ibossRecs = await db.collection('ibosscustomers').find(
    { custId: { $in: Array.from(endCustExtIds) } },
    { projection: { custId: 1, enterpriseName: 1 } }
  ).toArray();

  const enterpriseToGidMap_A = new Map();
  const enterpriseNames_A = new Set();
  ibossRecs.forEach(iboss => {
    const custIdStr = String(iboss.custId).trim();
    const gid = endCustExtIdToGidMap.get(custIdStr) || '';
    if (iboss.enterpriseName) {
      const eName = String(iboss.enterpriseName).trim();
      enterpriseToGidMap_A.set(eName, gid);
      enterpriseNames_A.add(eName);
    }
  });

  // 查 A端 与 B端 TCV
  const [tcvRecords_B, tcvRecords_A] = await Promise.all([
    db.collection('dmcTCV').find({ '签约客户标识': { $in: Array.from(extCustIds) } }).toArray(),
    db.collection('dmcTCV').find({ '终端客户名称': { $in: Array.from(enterpriseNames_A) } }).toArray()
  ]);

  const processTcv = (records) => {
    let filtered = records.filter(rec => String(rec['订单状态'] || '').trim().toLowerCase() !== 'achive');
    filtered.sort((a, b) => String(a._id).localeCompare(String(b._id)));
    const uniqueMap = new Map();
    filtered.forEach(rec => {
      const kSignDate = rec['合同签署日期'] !== undefined && rec['合同签署日期'] !== null ? String(rec['合同签署日期']).trim() : '';
      const kStartDate = rec['设置起租日期'] !== undefined && rec['设置起租日期'] !== null ? String(rec['设置起租日期']).trim() : '';
      const kCircuit = rec['电路编号'] !== undefined && rec['电路编号'] !== null ? String(rec['电路编号']).trim() : '';
      const kStatus = rec['订单状态'] !== undefined && rec['订单状态'] !== null ? String(rec['订单状态']).trim() : '';
      const kAmount = rec['签单金额(港币)'] !== undefined && rec['签单金额(港币)'] !== null ? String(rec['签单金额(港币)']).trim() : '';
      const duplicateKey = `${kSignDate}_${kStartDate}_${kCircuit}_${kStatus}_${kAmount}`;
      if (!uniqueMap.has(duplicateKey)) uniqueMap.set(duplicateKey, rec);
    });
    return Array.from(uniqueMap.values());
  };

  const finalTcv_B = processTcv(tcvRecords_B);
  const finalTcv_A = processTcv(tcvRecords_A);

  const tcvA = { '2025H1': { total: 0, byInd: {} }, '2026H1': { total: 0, byInd: {} } };
  const tcvB = { '2025H1': { total: 0, byInd: {} }, '2026H1': { total: 0, byInd: {} } };

  const circuitMap_A = new Map();
  const circuitMap_B = new Map();

  finalTcv_A.forEach(rec => {
    const eName = String(rec['终端客户名称'] || '').trim();
    const parentGid = enterpriseToGidMap_A.get(eName);
    const industry = parentGid ? gidToIndustryMap.get(parentGid) : undefined;
    if (rec['电路编号'] && industry && INDUSTRY_NAME_MAP[industry]) circuitMap_A.set(String(rec['电路编号']).trim(), industry);
    if (!industry || !INDUSTRY_NAME_MAP[industry]) return;
    const signDate = String(rec['合同签署日期'] || '').trim();
    const amount = parseFloat(rec['签单金额(港币)'] || 0);
    const indCn = INDUSTRY_NAME_MAP[industry];
    if (signDate >= '2025-01-01' && signDate <= '2025-06-30 23:59:59') {
      tcvA['2025H1'].total += amount;
      tcvA['2025H1'].byInd[indCn] = (tcvA['2025H1'].byInd[indCn] || 0) + amount;
    } else if (signDate >= '2026-01-01' && signDate <= '2026-06-30 23:59:59') {
      tcvA['2026H1'].total += amount;
      tcvA['2026H1'].byInd[indCn] = (tcvA['2026H1'].byInd[indCn] || 0) + amount;
    }
  });

  finalTcv_B.forEach(rec => {
    const extId = String(rec['签约客户标识'] || '').trim();
    const parentGid = extCustIdToGidMap.get(extId);
    const industry = parentGid ? gidToIndustryMap.get(parentGid) : undefined;
    if (rec['电路编号'] && industry && INDUSTRY_NAME_MAP[industry]) circuitMap_B.set(String(rec['电路编号']).trim(), industry);
    if (!industry || !INDUSTRY_NAME_MAP[industry]) return;
    const signDate = String(rec['合同签署日期'] || '').trim();
    const amount = parseFloat(rec['签单金额(港币)'] || 0);
    const indCn = INDUSTRY_NAME_MAP[industry];
    if (signDate >= '2025-01-01' && signDate <= '2025-06-30 23:59:59') {
      tcvB['2025H1'].total += amount;
      tcvB['2025H1'].byInd[indCn] = (tcvB['2025H1'].byInd[indCn] || 0) + amount;
    } else if (signDate >= '2026-01-01' && signDate <= '2026-06-30 23:59:59') {
      tcvB['2026H1'].total += amount;
      tcvB['2026H1'].byInd[indCn] = (tcvB['2026H1'].byInd[indCn] || 0) + amount;
    }
  });

  // BR 收入
  const circuits_A = Array.from(circuitMap_A.keys());
  const circuits_B = Array.from(circuitMap_B.keys());

  const brA = { '2025H1': { total: 0, byInd: {} }, '2026H1': { total: 0, byInd: {} } };
  const brB = { '2025H1': { total: 0, byInd: {} }, '2026H1': { total: 0, byInd: {} } };

  const [brRecs_A, brRecs_B] = await Promise.all([
    circuits_A.length ? db.collection('dmcBR').find({ '电路参考编号': { $in: circuits_A }, '数据月份': { $regex: /^(2025|2026)/ } }).toArray() : [],
    circuits_B.length ? db.collection('dmcBR').find({ '电路参考编号': { $in: circuits_B }, '数据月份': { $regex: /^(2025|2026)/ } }).toArray() : []
  ]);

  const processBr = (recs, circuitMap, targetObj) => {
    recs.forEach(rec => {
      const circuitId = String(rec['电路参考编号'] || '').trim();
      const industry = circuitMap.get(circuitId);
      if (!industry || !INDUSTRY_NAME_MAP[industry]) return;
      const month = String(rec['数据月份'] || '').trim();
      const rawAmount = rec['拆分后港币金额｜绝对值'] !== undefined
        ? rec['拆分后港币金额｜绝对值']
        : (rec['拆分后港币金额|绝对值'] !== undefined
            ? rec['拆分后港币金额|绝对值']
            : (rec['拆分后港币金额'] || 0));
      const amount = parseFloat(rawAmount || 0);
      const indCn = INDUSTRY_NAME_MAP[industry];
      if (['202501', '202502', '202503', '202504', '202505', '202506'].includes(month)) {
        targetObj['2025H1'].total += amount;
        targetObj['2025H1'].byInd[indCn] = (targetObj['2025H1'].byInd[indCn] || 0) + amount;
      } else if (['202601', '202602', '202603', '202604', '202605', '202606'].includes(month)) {
        targetObj['2026H1'].total += amount;
        targetObj['2026H1'].byInd[indCn] = (targetObj['2026H1'].byInd[indCn] || 0) + amount;
      }
    });
  };

  processBr(brRecs_A, circuitMap_A, brA);
  processBr(brRecs_B, circuitMap_B, brB);

  console.log('\n=============================================================');
  console.log('    A+B端 合计 2025上半年 vs 2026上半年 统计与同比对比 (HKD)   ');
  console.log('=============================================================\n');

  const totalTcv2025 = tcvA['2025H1'].total + tcvB['2025H1'].total;
  const totalTcv2026 = tcvA['2026H1'].total + tcvB['2026H1'].total;
  const totalBr2025 = brA['2025H1'].total + brB['2025H1'].total;
  const totalBr2026 = brA['2026H1'].total + brB['2026H1'].total;

  console.log('--- 1. A+B端 总体汇总 ---');
  console.log(`2025H1 A+B 签单金额 (TCV): ${totalTcv2025.toFixed(2)} HKD (${(totalTcv2025/1e6).toFixed(4)} M HKD)`);
  console.log(`2026H1 A+B 签单金额 (TCV): ${totalTcv2026.toFixed(2)} HKD (${(totalTcv2026/1e6).toFixed(4)} M HKD)`);
  console.log(`签单金额差额: ${(totalTcv2026 - totalTcv2025).toFixed(2)} HKD (${((totalTcv2026 - totalTcv2025)/1e6).toFixed(4)} M HKD)`);
  console.log(`签单金额 YoY: ${calcYoY(totalTcv2026, totalTcv2025)}\n`);

  console.log(`2025H1 A+B 计费收入 (BR): ${totalBr2025.toFixed(2)} HKD (${(totalBr2025/1e6).toFixed(4)} M HKD)`);
  console.log(`2026H1 A+B 计费收入 (BR): ${totalBr2026.toFixed(2)} HKD (${(totalBr2026/1e6).toFixed(4)} M HKD)`);
  console.log(`计费收入差额: ${(totalBr2026 - totalBr2025).toFixed(2)} HKD (${((totalBr2026 - totalBr2025)/1e6).toFixed(4)} M HKD)`);
  console.log(`计费收入 YoY: ${calcYoY(totalBr2026, totalBr2025)}\n`);

  console.log('--- 2. 8大行业 A+B 合计明细 ---');
  const allInds = Object.values(INDUSTRY_NAME_MAP);
  console.log('行业 | 2025H1 TCV(M) | 2026H1 TCV(M) | TCV YoY | 2025H1 BR(M) | 2026H1 BR(M) | BR YoY');
  allInds.forEach(ind => {
    const t25 = (tcvA['2025H1'].byInd[ind] || 0) + (tcvB['2025H1'].byInd[ind] || 0);
    const t26 = (tcvA['2026H1'].byInd[ind] || 0) + (tcvB['2026H1'].byInd[ind] || 0);
    const b25 = (brA['2025H1'].byInd[ind] || 0) + (brB['2025H1'].byInd[ind] || 0);
    const b26 = (brA['2026H1'].byInd[ind] || 0) + (brB['2026H1'].byInd[ind] || 0);
    console.log(`${ind} | ${(t25/1e6).toFixed(2)}M | ${(t26/1e6).toFixed(2)}M | ${calcYoY(t26, t25)} | ${(b25/1e6).toFixed(2)}M | ${(b26/1e6).toFixed(2)}M | ${calcYoY(b26, b25)}`);
  });

  await mongoose.disconnect();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
