const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

async function export3Tables() {
  const mongoUrl = process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017/node-boilerplate';
  console.log(`Connecting to local MongoDB: ${mongoUrl}...`);
  await mongoose.connect(mongoUrl, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const db = mongoose.connection.db;

  const collections = ['keyGlobalFamilyTree', 'keyFamilyTreeCustMapping', 'keycustomer'];
  const exportData = {};

  for (const colName of collections) {
    console.log(`Exporting collection: ${colName}...`);
    const docs = await db.collection(colName).find({}).toArray();
    exportData[colName] = docs;
    console.log(`Exported ${docs.length} documents from ${colName}.`);
  }

  const outputDir = path.join(__dirname, '../scratch');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, '3tables_data.json');
  console.log(`Writing data to ${outputPath}...`);
  fs.writeFileSync(outputPath, JSON.stringify(exportData), 'utf8');
  console.log(`Done! File size: ${(fs.statSync(outputPath).size / (1024 * 1024)).toFixed(2)} MB`);

  await mongoose.disconnect();
}

export3Tables().catch((err) => {
  console.error('Export error:', err);
  process.exit(1);
});
