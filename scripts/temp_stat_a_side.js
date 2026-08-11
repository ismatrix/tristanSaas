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
  console.log('MongoDB 已成功连接');
  const db = mongoose.connection.db;

  // 1. 获取要客清单与 GID -> 行业/客户名映射
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

  // 2. A端：仅 mappingPath="endCustomer" 的记录，用于通过 ibosscustomers 关联终端客户名称
  const mappings = await db.collection('keyFamilyTreeCustMapping').find({}, { projection: { GID: 1, extCustId: 1, ultimateGID: 1, mappingPath: 1 } }).toArray();
  const endCustExtIdToGidMap = new Map();
  const endCustExtIds = new Set();

  mappings.forEach(m => {
    if (m.extCustId && m.mappingPath === 'endCustomer') {
      const extId = String(m.extCustId).trim();
      const gidStr = m.ultimateGID ? String(m.ultimateGID).trim() : '';
      endCustExtIdToGidMap.set(extId, gidStr);
      endCustExtIds.add(extId);
    }
  });

  // 3. 通过 endCustomer extCustId 查询 ibosscustomers 的 enterpriseName
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

  console.log(`找到 A端 关联终端客户名称数量: ${enterpriseNames_A.size}`);

  // 4. 查询 A端 TCV 记录
  const tcvRecords_A = await db.collection('dmcTCV').find(
    { '终端客户名称': { $in: Array.from(enterpriseNames_A) } },
    { projection: { '终端客户名称': 1, '合同签署日期': 1, '设置起租日期': 1, '电路编号': 1, '订单状态': 1, '签单金额(港币)': 1 } }
  ).toArray();

  // 过滤 status !== 'achive' 且按 _id 排序
  let filteredTcv_A = tcvRecords_A.filter(rec => {
    const status = String(rec['订单状态'] || '').trim();
    return status.toLowerCase() !== 'achive';
  });
  filteredTcv_A.sort((a, b) => String(a._id).localeCompare(String(b._id)));

  // 按 5 字段去重
  const uniqueTcvMap_A = new Map();
  filteredTcv_A.forEach(rec => {
    const kSignDate = rec['合同签署日期'] !== undefined && rec['合同签署日期'] !== null ? String(rec['合同签署日期']).trim() : '';
    const kStartDate = rec['设置起租日期'] !== undefined && rec['设置起租日期'] !== null ? String(rec['设置起租日期']).trim() : '';
    const kCircuit = rec['电路编号'] !== undefined && rec['电路编号'] !== null ? String(rec['电路编号']).trim() : '';
    const kStatus = rec['订单状态'] !== undefined && rec['订单状态'] !== null ? String(rec['订单状态']).trim() : '';
    const kAmount = rec['签单金额(港币)'] !== undefined && rec['签单金额(港币)'] !== null ? String(rec['签单金额(港币)']).trim() : '';
    const duplicateKey = `${kSignDate}_${kStartDate}_${kCircuit}_${kStatus}_${kAmount}`;
    if (!uniqueTcvMap_A.has(duplicateKey)) {
      uniqueTcvMap_A.set(duplicateKey, rec);
    }
  });
  const finalTcvRecords_A = Array.from(uniqueTcvMap_A.values());

  // 统计 2025上半年 & 2026上半年 签单金额
  const tcvStats_A = {
    '2025H1': { total: 0, byIndustry: {}, byCustomer: {}, count: 0 },
    '2026H1': { total: 0, byIndustry: {}, byCustomer: {}, count: 0 },
  };

  const circuitToIndustryMap_A = new Map();
  const circuitToCustomerNameMap_A = new Map();

  finalTcvRecords_A.forEach(rec => {
    const eName = String(rec['终端客户名称'] || '').trim();
    const parentGid = enterpriseToGidMap_A.get(eName);
    const industry = parentGid ? gidToIndustryMap.get(parentGid) : undefined;
    const customerName = parentGid ? (gidToCustomerNameMap.get(String(parentGid)) || '未知客户') : '未知客户';

    if (rec['电路编号'] && industry && INDUSTRY_NAME_MAP[industry]) {
      circuitToIndustryMap_A.set(String(rec['电路编号']).trim(), industry);
    }
    if (rec['电路编号']) {
      circuitToCustomerNameMap_A.set(String(rec['电路编号']).trim(), customerName);
    }

    if (!industry || !INDUSTRY_NAME_MAP[industry]) return;

    const signDate = String(rec['合同签署日期'] || '').trim();
    const amount = parseFloat(rec['签单金额(港币)'] || 0);

    let period = null;
    if (signDate >= '2025-01-01' && signDate <= '2025-06-30 23:59:59') {
      period = '2025H1';
    } else if (signDate >= '2026-01-01' && signDate <= '2026-06-30 23:59:59') {
      period = '2026H1';
    }

    if (period) {
      tcvStats_A[period].total += amount;
      tcvStats_A[period].count += 1;

      const indCn = INDUSTRY_NAME_MAP[industry] || industry;
      tcvStats_A[period].byIndustry[indCn] = (tcvStats_A[period].byIndustry[indCn] || 0) + amount;
      tcvStats_A[period].byCustomer[customerName] = (tcvStats_A[period].byCustomer[customerName] || 0) + amount;
    }
  });

  // 5. 获取 A端 BR 收入数据
  const activeCircuits_A = Array.from(circuitToIndustryMap_A.keys());

  const brStats_A = {
    '2025H1': { total: 0, byIndustry: {}, byCustomer: {}, count: 0 },
    '2026H1': { total: 0, byIndustry: {}, byCustomer: {}, count: 0 },
  };

  if (activeCircuits_A.length > 0) {
    const brRecords_A = await db.collection('dmcBR').find(
      {
        '电路参考编号': { $in: activeCircuits_A },
        '数据月份': { $regex: /^(2025|2026)/ }
      },
      {
        projection: {
          '电路参考编号': 1,
          '数据月份': 1,
          '拆分后港币金额': 1,
          '拆分后港币金额｜绝对值': 1,
          '拆分后港币金额|绝对值': 1
        }
      }
    ).toArray();

    brRecords_A.forEach(rec => {
      const circuitId = String(rec['电路参考编号'] || '').trim();
      const industry = circuitToIndustryMap_A.get(circuitId);
      const customerName = circuitToCustomerNameMap_A.get(circuitId) || '未知客户';
      if (!industry || !INDUSTRY_NAME_MAP[industry]) return;

      const month = String(rec['数据月份'] || '').trim();
      const rawAmount = rec['拆分后港币金额｜绝对值'] !== undefined
        ? rec['拆分后港币金额｜绝对值']
        : (rec['拆分后港币金额|绝对值'] !== undefined
            ? rec['拆分后港币金额|绝对值']
            : (rec['拆分后港币金额'] || 0));
      const amount = parseFloat(rawAmount || 0);

      let period = null;
      if (['202501', '202502', '202503', '202504', '202505', '202506'].includes(month)) {
        period = '2025H1';
      } else if (['202601', '202602', '202603', '202604', '202605', '202606'].includes(month)) {
        period = '2026H1';
      }

      if (period) {
        brStats_A[period].total += amount;
        brStats_A[period].count += 1;

        const indCn = INDUSTRY_NAME_MAP[industry] || industry;
        brStats_A[period].byIndustry[indCn] = (brStats_A[period].byIndustry[indCn] || 0) + amount;
        brStats_A[period].byCustomer[customerName] = (brStats_A[period].byCustomer[customerName] || 0) + amount;
      }
    });
  }

  console.log('\n======================================================');
  console.log('    A端 2025上半年 vs 2026上半年 统计与同比对比 (HKD)   ');
  console.log('======================================================\n');

  console.log('--- 1. 签单金额 (TCV) 汇总 ---');
  const tcv2025 = tcvStats_A['2025H1'].total;
  const tcv2026 = tcvStats_A['2026H1'].total;
  console.log(`2025上半年 A端签单金额: ${tcv2025.toFixed(2)} HKD (${(tcv2025 / 1e6).toFixed(4)} M HKD), 笔数: ${tcvStats_A['2025H1'].count}`);
  console.log(`2026上半年 A端签单金额: ${tcv2026.toFixed(2)} HKD (${(tcv2026 / 1e6).toFixed(4)} M HKD), 笔数: ${tcvStats_A['2026H1'].count}`);
  console.log(`签单金额差额: ${(tcv2026 - tcv2025).toFixed(2)} HKD (${((tcv2026 - tcv2025) / 1e6).toFixed(4)} M HKD)`);
  console.log(`签单金额同比增长率 (YoY): ${calcYoY(tcv2026, tcv2025)}\n`);

  console.log('--- 2. 收入数据 (BR) 汇总 ---');
  const br2025 = brStats_A['2025H1'].total;
  const br2026 = brStats_A['2026H1'].total;
  console.log(`2025上半年 A端收入数据: ${br2025.toFixed(2)} HKD (${(br2025 / 1e6).toFixed(4)} M HKD), 记录数: ${brStats_A['2025H1'].count}`);
  console.log(`2026上半年 A端收入数据: ${br2026.toFixed(2)} HKD (${(br2026 / 1e6).toFixed(4)} M HKD), 记录数: ${brStats_A['2026H1'].count}`);
  console.log(`收入数据差额: ${(br2026 - br2025).toFixed(2)} HKD (${((br2026 - br2025) / 1e6).toFixed(4)} M HKD)`);
  console.log(`收入数据同比增长率 (YoY): ${calcYoY(br2026, br2025)}\n`);

  console.log('--- 3. 8大行业 TCV 与 BR 同比明细 ---');
  const allIndustries = Object.values(INDUSTRY_NAME_MAP);
  console.log('行业 | 2025H1 TCV | 2026H1 TCV | TCV YoY | 2025H1 BR | 2026H1 BR | BR YoY');
  allIndustries.forEach(ind => {
    const t25 = tcvStats_A['2025H1'].byIndustry[ind] || 0;
    const t26 = tcvStats_A['2026H1'].byIndustry[ind] || 0;
    const b25 = brStats_A['2025H1'].byIndustry[ind] || 0;
    const b26 = brStats_A['2026H1'].byIndustry[ind] || 0;
    console.log(`${ind} | ${(t25/1e6).toFixed(2)}M | ${(t26/1e6).toFixed(2)}M | ${calcYoY(t26, t25)} | ${(b25/1e6).toFixed(2)}M | ${(b26/1e6).toFixed(2)}M | ${calcYoY(b26, b25)}`);
  });

  console.log('\n--- 4. 按客户明细完整数据 (JSON输出) ---');
  const resultData = {
    summary: {
      tcv: { H1_2025: tcv2025, H1_2026: tcv2026, diff: tcv2026 - tcv2025, yoy: calcYoY(tcv2026, tcv2025) },
      br: { H1_2025: br2025, H1_2026: br2026, diff: br2026 - br2025, yoy: calcYoY(br2026, br2025) }
    },
    byIndustry: allIndustries.map(ind => ({
      industry: ind,
      tcv_2025H1: tcvStats_A['2025H1'].byIndustry[ind] || 0,
      tcv_2026H1: tcvStats_A['2026H1'].byIndustry[ind] || 0,
      tcv_yoy: calcYoY(tcvStats_A['2026H1'].byIndustry[ind] || 0, tcvStats_A['2025H1'].byIndustry[ind] || 0),
      br_2025H1: brStats_A['2025H1'].byIndustry[ind] || 0,
      br_2026H1: brStats_A['2026H1'].byIndustry[ind] || 0,
      br_yoy: calcYoY(brStats_A['2026H1'].byIndustry[ind] || 0, brStats_A['2025H1'].byIndustry[ind] || 0),
    })),
    tcvByCustomer: {
      H1_2025: tcvStats_A['2025H1'].byCustomer,
      H1_2026: tcvStats_A['2026H1'].byCustomer
    },
    brByCustomer: {
      H1_2025: brStats_A['2025H1'].byCustomer,
      H1_2026: brStats_A['2026H1'].byCustomer
    }
  };

  await mongoose.disconnect();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
