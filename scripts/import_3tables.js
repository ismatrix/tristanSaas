const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

async function import3Tables() {
  const mongoUrl = process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017/node-boilerplate';
  console.log(`Connecting to MongoDB: ${mongoUrl}...`);
  await mongoose.connect(mongoUrl, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const db = mongoose.connection.db;

  const dataPath = path.join(__dirname, '../scratch/3tables_data.json');
  if (!fs.existsSync(dataPath)) {
    throw new Error(`Data file not found at ${dataPath}`);
  }

  console.log(`Reading data from ${dataPath}...`);
  const raw = fs.readFileSync(dataPath, 'utf8');
  const data = JSON.parse(raw);

  const collections = ['keyGlobalFamilyTree', 'keyFamilyTreeCustMapping', 'keycustomer'];

  for (const colName of collections) {
    const docs = data[colName];
    if (!docs || !Array.isArray(docs)) {
      console.warn(`No data found for collection ${colName}, skipping.`);
      continue;
    }

    console.log(`Clearing collection ${colName}...`);
    await db.collection(colName).deleteMany({});

    if (docs.length > 0) {
      console.log(`Importing ${docs.length} documents into ${colName}...`);
      // 分批插入避免超出内存限制
      const batchSize = 1000;
      for (let i = 0; i < docs.length; i += batchSize) {
        const batch = docs.slice(i, i + batchSize);
        // 将 _id 转换为 ObjectId 或保留原有类型
        const formattedBatch = batch.map((doc) => {
          if (doc._id && typeof doc._id === 'string' && doc._id.length === 24) {
            try {
              doc._id = new mongoose.Types.ObjectId(doc._id);
            } catch {}
          }
          return doc;
        });
        await db.collection(colName).insertMany(formattedBatch, { ordered: false });
      }
    }

    const currentCount = await db.collection(colName).countDocuments();
    console.log(`Verification: ${colName} now has ${currentCount} documents.`);
  }

  // 重建常用索引
  console.log('Rebuilding indexes...');
  try {
    await db.collection('keyGlobalFamilyTree').createIndex({ GID: 1 });
    await db.collection('keyGlobalFamilyTree').createIndex({ ultimateGID: 1 });
    await db.collection('keyGlobalFamilyTree').createIndex({ parentGID: 1 });
    await db.collection('keyFamilyTreeCustMapping').createIndex({ extCustId: 1 });
    await db.collection('keyFamilyTreeCustMapping').createIndex({ GID: 1 });
    await db.collection('keyFamilyTreeCustMapping').createIndex({ ultimateGID: 1 });
    await db.collection('keycustomer').createIndex({ GID: 1 });
    console.log('Indexes created successfully.');
  } catch (e) {
    console.warn('Index creation warning:', e.message);
  }

  console.log('All 3 tables imported and verified successfully!');
  await mongoose.disconnect();
}

import3Tables().catch((err) => {
  console.error('Import error:', err);
  process.exit(1);
});
