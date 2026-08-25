const mongoose = require('mongoose');

async function createPerformanceIndexes() {
  const mongoUrl = process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017/node-boilerplate';
  console.log(`Connecting to MongoDB: ${mongoUrl}...`);
  await mongoose.connect(mongoUrl, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const db = mongoose.connection.db;

  console.log('--- Creating Performance Indexes ---');

  // 1. dmcBR: 复合索引加速计费查询
  try {
    console.log('Indexing dmcBR...');
    await db.collection('dmcBR').createIndex({ '电路参考编号': 1, '数据月份': 1 }, { background: true });
    await db.collection('dmcBR').createIndex({ '签约客户名称': 1 }, { background: true });
    console.log('✓ dmcBR indexes created.');
  } catch (e) {
    console.warn('dmcBR index warning:', e.message);
  }

  // 2. dmcTCV: 复合索引加速签单查询
  try {
    console.log('Indexing dmcTCV...');
    await db.collection('dmcTCV').createIndex({ '签约客户标识': 1, '订单状态': 1 }, { background: true });
    await db.collection('dmcTCV').createIndex({ '终端客户名称': 1, '订单状态': 1 }, { background: true });
    console.log('✓ dmcTCV indexes created.');
  } catch (e) {
    console.warn('dmcTCV index warning:', e.message);
  }

  // 3. keyGlobalFamilyTree: 树状与分支高效检索
  try {
    console.log('Indexing keyGlobalFamilyTree...');
    await db.collection('keyGlobalFamilyTree').createIndex({ ultimateGID: 1, GID: 1 }, { background: true });
    await db.collection('keyGlobalFamilyTree').createIndex({ registeredCountry: 1, entityTypeName: 1 }, { background: true });
    await db.collection('keyGlobalFamilyTree').createIndex({ cmiRegion: 1 }, { background: true });
    await db.collection('keyGlobalFamilyTree').createIndex({ cmiIndustry: 1 }, { background: true });
    console.log('✓ keyGlobalFamilyTree indexes created.');
  } catch (e) {
    console.warn('keyGlobalFamilyTree index warning:', e.message);
  }

  // 4. keyFamilyTreeCustMapping
  try {
    console.log('Indexing keyFamilyTreeCustMapping...');
    await db.collection('keyFamilyTreeCustMapping').createIndex({ extCustId: 1, ultimateGID: 1 }, { background: true });
    await db.collection('keyFamilyTreeCustMapping').createIndex({ mappingPath: 1 }, { background: true });
    console.log('✓ keyFamilyTreeCustMapping indexes created.');
  } catch (e) {
    console.warn('keyFamilyTreeCustMapping index warning:', e.message);
  }

  // 5. ibosscustomers
  try {
    console.log('Indexing ibosscustomers...');
    await db.collection('ibosscustomers').createIndex({ custId: 1 }, { background: true });
    await db.collection('ibosscustomers').createIndex({ enterpriseName: 1 }, { background: true });
    console.log('✓ ibosscustomers indexes created.');
  } catch (e) {
    console.warn('ibosscustomers index warning:', e.message);
  }

  console.log('--- All Performance Indexes Created Successfully! ---');
  await mongoose.disconnect();
}

createPerformanceIndexes().catch(err => {
  console.error('Error creating indexes:', err);
  process.exit(1);
});
