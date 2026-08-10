require('dotenv').config();
const mongoose = require('mongoose');
const xlsx = require('xlsx');
const path = require('path');

// Excel 文件路径
const EXCEL_PATH = '/Users/tristan/Downloads/企业名称缩写对照表（更新关联关键词）-260806.xlsx';

async function updateKeyCustomerKeyWords() {
  const mongoUrl = process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017/node-boilerplate';
  console.log('正在连接 MongoDB 数据库...');
  await mongoose.connect(mongoUrl, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log('数据库连接成功。');

  const db = mongoose.connection.db;
  const collection = db.collection('keycustomer');

  console.log(`正在读取 Excel 文件: ${EXCEL_PATH}`);
  const workbook = xlsx.readFile(EXCEL_PATH);
  const sheetName = workbook.SheetNames[0];
  console.log(`使用工作表: ${sheetName}`);

  const rawRows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
  if (!rawRows || rawRows.length <= 1) {
    console.log('Excel 中没有有效数据。');
    await mongoose.disconnect();
    return;
  }

  const header = rawRows[0];
  console.log('Excel 表头:', header);

  const matchedList = [];
  const unmatchedList = [];
  const bulkOperations = [];

  for (let i = 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!row || row.length === 0) continue;

    // A列/B列 GID
    const gidCol0 = row[0] != null ? String(row[0]).trim() : '';
    const gidCol1 = row[1] != null ? String(row[1]).trim() : '';
    const nameEn = row[2] != null ? String(row[2]).trim() : '';
    const nameCn = row[3] != null ? String(row[3]).trim() : '';
    // K列 关键字合集 (索引 10)
    const rawKeyWords = row[10] != null ? String(row[10]).trim() : '';

    const gid = gidCol0 || gidCol1;
    if (!gid) {
      console.log(`第 ${i + 1} 行 GID 为空，跳过`);
      continue;
    }

    // 根据顿号“、”分隔拆分关键字，去除首尾空格并过滤空元素
    const keyWordsArray = rawKeyWords
      ? rawKeyWords
          .split('、')
          .map((item) => item.trim())
          .filter(Boolean)
      : [];

    // 在 keycustomer 集中按 GID 进行匹配
    const doc = await collection.findOne({ GID: gid });
    if (doc) {
      matchedList.push({
        excelRow: i + 1,
        gid,
        nameCn,
        dbNameCn: doc.nameCn,
        keyWordsCount: keyWordsArray.length,
        keyWordsArray,
      });

      bulkOperations.push({
        updateOne: {
          filter: { _id: doc._id },
          update: { $set: { keyWords: keyWordsArray } },
        },
      });
    } else {
      unmatchedList.push({
        excelRow: i + 1,
        gid,
        nameEn,
        nameCn,
        rawKeyWords,
      });
    }
  }

  console.log('\n=================== 匹配结果统计 ===================');
  console.log(`Excel 总数据行数: ${rawRows.length - 1}`);
  console.log(`成功匹配到的记录数: ${matchedList.length}`);
  console.log(`未匹配到的记录数: ${unmatchedList.length}`);

  if (bulkOperations.length > 0) {
    console.log(`\n正在批量更新 ${bulkOperations.length} 条记录到 keycustomer 表...`);
    const bulkRes = await collection.bulkWrite(bulkOperations);
    console.log(`批量更新完成！修改行数: ${bulkRes.modifiedCount}, 匹配行数: ${bulkRes.matchedCount}`);
  }

  if (unmatchedList.length > 0) {
    console.log('\n=================== 未匹配到的 GID 清单 ===================');
    unmatchedList.forEach((item, index) => {
      console.log(
        `${index + 1}. [行 ${item.excelRow}] GID: ${item.gid} | 中文名: ${item.nameCn || '无'} | 英文名: ${item.nameEn || '无'}`
      );
    });
  }

  console.log('\n正在断开数据库连接...');
  await mongoose.disconnect();
  console.log('数据库连接已安全断开。');
}

updateKeyCustomerKeyWords().catch((err) => {
  console.error('更新过程中发生错误:', err);
  process.exit(1);
});
