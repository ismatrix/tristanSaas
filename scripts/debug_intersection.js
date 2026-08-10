const mongoose = require('mongoose');

async function main() {
  const url = 'mongodb://127.0.0.1:27017/node-boilerplate';
  console.log('Connecting to local MongoDB...');
  const conn = await mongoose.connect(url, { useNewUrlParser: true, useUnifiedTopology: true });
  const db = conn.connection.db;

  const gidStr = "653710657653710657"; // 工商银行
  console.log(`\n--- Inspecting Intersection for ICBC (GID: ${gidStr}) ---`);

  // 1. 获取树表里的所有节点 GID
  const treeNodes = await db.collection('keyGlobalFamilyTree').find({ ultimateGID: gidStr }).toArray();
  const treeGids = new Set(treeNodes.map(n => String(n.GID).trim()).filter(Boolean));
  console.log(`Nodes count in keyGlobalFamilyTree: ${treeNodes.length}`);
  console.log(`Unique GIDs in keyGlobalFamilyTree: ${treeGids.size}`);
  
  if (treeNodes.length > 0) {
    console.log('Sample tree GIDs (first 5):', Array.from(treeGids).slice(0, 5));
  }

  // 2. 获取映射表里算出的 39 个被渗透 GID
  const mappings = await db.collection('keyFamilyTreeCustMapping').find({ ultimateGID: gidStr }).toArray();
  const extCustIds = mappings.map(m => m.extCustId).filter(Boolean);

  const allTcv = await db.collection('dmcTCV').find({}).toArray();
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

  console.log(`Penetrated GIDs count in mapping table: ${penetratedGids.size}`);
  console.log('Sample penetrated GIDs (first 5):', Array.from(penetratedGids).slice(0, 5));

  // 3. 计算交集
  const intersection = Array.from(penetratedGids).filter(gid => treeGids.has(gid));
  console.log(`\nIntersection count (penetrated GIDs that exist in tree nodes): ${intersection.length}`);
  if (intersection.length > 0) {
    console.log('Intersection GIDs:', intersection);
  } else {
    console.log('WARNING: ZERO intersection! The GIDs in tree nodes and mapping table do not match at all!');
  }

  await conn.disconnect();
}

main().catch(console.error);
