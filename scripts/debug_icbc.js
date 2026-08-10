const mongoose = require('mongoose');

async function main() {
  const url = 'mongodb://127.0.0.1:27017/node-boilerplate';
  console.log('Connecting to local MongoDB...');
  const conn = await mongoose.connect(url, { useNewUrlParser: true, useUnifiedTopology: true });
  const db = conn.connection.db;

  const gidStr = "653710657653710657"; // 工商银行
  console.log(`\n--- Inspecting ICBC (GID: ${gidStr}) ---`);

  // 1. 查找 mappings
  const mappings = await db.collection('keyFamilyTreeCustMapping').find({ ultimateGID: gidStr }).toArray();
  console.log(`Mappings found for ICBC: ${mappings.length}`);
  
  if (mappings.length > 0) {
    console.log('Sample mappings (first 5):', mappings.slice(0, 5).map(m => ({ GID: m.GID, extCustId: m.extCustId })));
  }

  const extCustIds = mappings.map(m => m.extCustId).filter(Boolean);
  console.log(`Unique extCustIds in mappings: ${extCustIds.length}`);

  // 2. 查找全库 TCV 中这些 extCustIds 是否有签单
  const bTcv = await db.collection('dmcTCV').find({ '签约客户标识': { $in: extCustIds } }).toArray();
  console.log(`Direct B-side TCV records for ICBC extCustIds: ${bTcv.length}`);
  if (bTcv.length > 0) {
    console.log('Sample B-side TCV order status:', bTcv.map(t => t['订单状态']));
  }

  // 3. A端关联
  const endCustExtIds = mappings.filter(m => m.mappingPath === 'endCustomer').map(m => m.extCustId).filter(Boolean);
  let enterpriseNames = [];
  if (endCustExtIds.length > 0) {
    const ibossCustomers = await db.collection('ibosscustomers').find({ custId: { $in: endCustExtIds } }).toArray();
    enterpriseNames = ibossCustomers.map(c => c.enterpriseName).filter(Boolean);
    console.log(`A-side enterprise names matching endCustomer paths:`, enterpriseNames);
  }

  const aTcv = await db.collection('dmcTCV').find({ '终端客户名称': { $in: enterpriseNames } }).toArray();
  console.log(`A-side TCV records matching enterprise names: ${aTcv.length}`);

  // 4. 统计全库 TCV
  const allTcv = await db.collection('dmcTCV').find({}).toArray();
  console.log(`Total TCV records in database: ${allTcv.length}`);

  // 5. 查找 mappings 中是否存在已被渗透的 extCustId
  const nonAchiveTcv = allTcv.filter(t => String(t['订单状态'] || '').trim().toLowerCase() !== 'achive');
  const signedExtCustIds = new Set();
  nonAchiveTcv.forEach(rec => {
    if (rec['签约客户标识']) signedExtCustIds.add(String(rec['签约客户标识']).trim());
  });

  const penetratedGids = new Set();
  mappings.forEach(m => {
    const extId = m.extCustId ? String(m.extCustId).trim() : '';
    if (extId && m.GID && signedExtCustIds.has(extId)) {
      penetratedGids.add(String(m.GID).trim());
    }
  });

  console.log(`Final penetratedGids count for ICBC: ${penetratedGids.size}`);
  console.log('Penetrated GIDs:', Array.from(penetratedGids));

  await conn.disconnect();
}

main().catch(console.error);
