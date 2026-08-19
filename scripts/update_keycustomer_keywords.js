const XLSX = require('xlsx');
const mongoose = require('mongoose');
const config = require('../src/config/config');

async function updateKeyCustomerKeywords() {
  const filePath = '/Users/tristan/Downloads/第二批数据-关键词-260813.xlsx';
  console.log(`正在读取 Excel: ${filePath}...`);

  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  console.log(`成功读取工作表: ${sheetName}, 共 ${rows.length} 行 (包含表头)`);

  const updates = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row[2]) continue;

    const gid = String(row[2]).trim();
    const abbr = row[5] !== undefined && row[5] !== null ? String(row[5]).trim() : '';

    const keywords = [];
    // 列 F(5), G(6), H(7), I(8), J(9), K(10), L(11)
    for (let c = 5; c <= 11; c++) {
      const val = row[c];
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        const parts = String(val).split('、');
        for (const part of parts) {
          const clean = part.trim();
          if (clean && !keywords.includes(clean)) {
            keywords.push(clean);
          }
        }
      }
    }

    updates.push({
      gid,
      abbr,
      keywords,
      nameCn: row[0] ? String(row[0]).trim() : '',
      nameEn: row[1] ? String(row[1]).trim() : '',
    });
  }

  console.log(`共解析出 ${updates.length} 条待更新企业数据。`);

  await mongoose.connect(config.mongoose.url, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const db = mongoose.connection.db;

  const bulkOps = updates.map(item => ({
    updateMany: {
      filter: { GID: item.gid },
      update: {
        $set: {
          abbr: item.abbr,
          keyWords: item.keywords,
        }
      }
    }
  }));

  const res = await db.collection('keycustomer').bulkWrite(bulkOps);
  console.log(`✅ 成功更新 keycustomer 集合！匹配数: ${res.matchedCount}, 修改数: ${res.modifiedCount}`);

  // 抽样验证
  const sample = await db.collection('keycustomer').find({
    GID: { $in: updates.slice(0, 5).map(u => u.gid) }
  }).toArray();

  console.log('\n=== 抽样验证前 5 条更新结果 ===');
  sample.forEach(c => {
    console.log(`- [${c.GID}] ${c.nameCn} | 缩写(abbr): ${c.abbr} | 关键字数: ${c.keyWords?.length} | 关键字: ${JSON.stringify(c.keyWords)}`);
  });

  await mongoose.disconnect();
  console.log('\nMongoDB 连接已断开。');
}

updateKeyCustomerKeywords().catch(err => {
  console.error('更新失败:', err);
  process.exit(1);
});
