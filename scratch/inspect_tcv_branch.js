const mongoose = require('mongoose');
const config = require('../src/config/config');

async function inspect() {
  await mongoose.connect(config.mongoose.url, config.mongoose.options);
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db;

  const keyTreeCount = await db.collection('keyGlobalFamilyTree').countDocuments();
  console.log(`keyGlobalFamilyTree total documents: ${keyTreeCount}`);

  // 读取 mappings
  const mappings = await db.collection('keyFamilyTreeCustMapping').find({}, { projection: { GID: 1, extCustId: 1, ultimateGID: 1, mappingPath: 1 } }).toArray();
  
  const extCustIdToBranchGidMap = new Map(); // extCustId -> branch GID
  const extCustIds = new Set();

  const endCustExtIdToBranchGidMap = new Map(); // extCustId -> branch GID
  const endCustExtIds = new Set();

  mappings.forEach(m => {
    if (m.extCustId) {
      const extId = String(m.extCustId).trim();
      const branchGid = m.GID ? String(m.GID).trim() : '';
      if (branchGid) {
        extCustIdToBranchGidMap.set(extId, branchGid);
        extCustIds.add(extId);

        if (m.mappingPath === 'endCustomer') {
          endCustExtIdToBranchGidMap.set(extId, branchGid);
          endCustExtIds.add(extId);
        }
      }
    }
  });

  // A 端 关联企名
  const customers = await db.collection('ibosscustomers').find(
    { custId: { $in: Array.from(endCustExtIds) } },
    { projection: { custId: 1, enterpriseName: 1 } }
  ).toArray();

  const enterpriseNameToBranchGidMap = new Map();
  const enterpriseNames = new Set();
  customers.forEach(c => {
    if (c.enterpriseName) {
      const name = String(c.enterpriseName).trim().toLowerCase();
      const branchGid = endCustExtIdToBranchGidMap.get(String(c.custId).trim());
      if (name && branchGid) {
        enterpriseNameToBranchGidMap.set(name, branchGid);
        enterpriseNames.add(name);
      }
    }
  });

  // 读取所有有效 TCV 记录
  const tcvRecords = await db.collection('dmcTCV').find(
    {
      $or: [
        { '签约客户标识': { $in: Array.from(extCustIds) } },
        { '终端客户名称': { $in: Array.from(enterpriseNames) } }
      ]
    },
    { projection: { '签约客户标识': 1, '终端客户名称': 1, '合同签署日期': 1, '设置起租日期': 1, '电路编号': 1, '订单状态': 1, '签单金额(港币)': 1 } }
  ).toArray();

  // 1. 过滤 Achive
  let filteredTcv = tcvRecords.filter(rec => {
    const status = String(rec['订单状态'] || '').trim();
    return status.toLowerCase() !== 'achive';
  });

  filteredTcv.sort((a, b) => String(a._id).localeCompare(String(b._id)));

  // 2. 去重
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

  // 统计每一个分支 GID 匹配到的 TCV 笔数
  const branchTcvCountMap = new Map();
  finalTcvRecords.forEach(rec => {
    const signId = rec['签约客户标识'] ? String(rec['签约客户标识']).trim() : '';
    const endName = rec['终端客户名称'] ? String(rec['终端客户名称']).trim().toLowerCase() : '';

    const matchedBranchGids = new Set();
    if (signId && extCustIdToBranchGidMap.has(signId)) {
      matchedBranchGids.add(extCustIdToBranchGidMap.get(signId));
    }
    if (endName && enterpriseNameToBranchGidMap.has(endName)) {
      matchedBranchGids.add(enterpriseNameToBranchGidMap.get(endName));
    }

    matchedBranchGids.forEach(gid => {
      branchTcvCountMap.set(gid, (branchTcvCountMap.get(gid) || 0) + 1);
    });
  });

  console.log(`Penetrated branches count (branches with TCV > 0): ${branchTcvCountMap.size}`);

  // 查看几个样例节点
  const sampleNodes = await db.collection('keyGlobalFamilyTree').find({}).limit(10).toArray();
  console.log('Sample keyGlobalFamilyTree nodes with TCV count:');
  sampleNodes.forEach(node => {
    const gid = String(node.GID);
    const count = branchTcvCountMap.get(gid) || 0;
    console.log({
      ultimateName: node.ultimateName,
      companyNameCn: node.companyNameCn,
      companyNameEn: node.companyNameEn,
      entityTypeName: node.entityTypeName,
      registeredCountry: node.registeredCountry,
      tcvCount: count
    });
  });

  await mongoose.disconnect();
}

inspect().catch(console.error);
