const XLSX = require('xlsx');
const mongoose = require('mongoose');
require('dotenv').config();

// 处理 Excel 数据行，清理 NaN 和空值
function cleanRow(row) {
  const cleaned = {};
  for (const key of Object.keys(row)) {
    // 忽略未命名的列
    if (key.startsWith('Unnamed:') || key.startsWith('__EMPTY')) continue;

    const val = row[key];
    if (val === null || val === undefined || val === '') {
      cleaned[key] = null;
    } else {
      // 去除两端空格
      cleaned[key] = typeof val === 'string' ? val.trim() : val;
    }
  }
  return cleaned;
}

async function runImport() {
  const startTime = Date.now();
  console.log('==================================================');
  console.log('  导入 columnMappingKeyContacts 脚本开始运行');
  console.log('==================================================\n');

  const filePath = '/Users/tristan/Downloads/要客数据治理模型.tristan.20260522 (1).xlsx';
  const sheetName = 'columnMappingKeyContacts';
  const collectionName = 'columnMappingKeyContacts';

  try {
    // 1. 连接本地 MongoDB
    const mongoUrl = process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017/node-boilerplate';
    await mongoose.connect(mongoUrl, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ 本地 MongoDB 连接成功！\n');
    const db = mongoose.connection.db;

    // 2. 读取并解析 Excel 文件
    console.log(`正在读取文件: ${filePath} (Sheet: ${sheetName})`);
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
      throw new Error(`找不到指定的 Sheet: ${sheetName}`);
    }

    // 读取所有数据行
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });
    console.log(`  共读取到 ${rows.length} 条原始记录`);

    // 清洗数据
    const cleanedRows = rows.map(cleanRow);

    // 3. 覆盖写入数据库
    console.log(`  正在清空本地 MongoDB 集合: ${collectionName} ...`);
    await db.collection(collectionName).deleteMany({});

    if (cleanedRows.length > 0) {
      console.log(`  正在写入本地 MongoDB 集合: ${collectionName} ...`);
      const result = await db.collection(collectionName).insertMany(cleanedRows);
      console.log(`  ✅ 写入成功，共导入 ${result.insertedCount} 条记录\n`);
    } else {
      console.log('  ⚠️ 数据为空，已完成清空。\n');
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('==================================================');
    console.log(`  🎉 数据覆盖导入成功！总耗时: ${elapsed} 秒`);
    console.log('==================================================');

  } catch (err) {
    console.error('\n❌ 导入过程中发生错误:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n数据库连接已关闭。');
  }
}

runImport();
