require('dotenv').config();
const mongoose = require('mongoose');
const xlsx = require('xlsx');

const EXCEL_PATH = '/Users/tristan/Downloads/Book1.xlsx';

async function updateKeyCustomerKeyWordsFromBook1() {
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

  // 识别 PID 列 和 KEYS 列的索引
  let pidIndex = 0;
  let keysIndex = 1;

  header.forEach((colName, idx) => {
    if (!colName) return;
    const nameStr = String(colName).trim().toUpperCase();
    if (nameStr === 'PID') pidIndex = idx;
    if (nameStr === 'KEYS' || nameStr === 'KEY' || nameStr === 'KEYWORDS') keysIndex = idx;
  });

  const matchedList = [];
  const unmatchedList = [];
  const bulkOperations = [];

  for (let i = 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!row || row.length === 0) continue;

    const pid = row[pidIndex] != null ? String(row[pidIndex]).trim() : '';
    const rawKeys = row[keysIndex] != null ? String(row[keysIndex]).trim() : '';

    if (!pid) {
      console.log(`第 ${i + 1} 行 PID 为空，跳过`);
      continue;
    }

    // 根据英文逗号“,”分隔拆分关键字，去除首尾空格并过滤空元素
    const keyWordsArray = rawKeys
      ? rawKeys
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
      : [];

    // 在 keycustomer 集中按 PID（或 GID）进行匹配
    let doc = await collection.findOne({ PID: pid });
    if (!doc) {
      doc = await collection.findOne({ GID: pid });
    }

    if (doc) {
      matchedList.push({
        excelRow: i + 1,
        excelPid: pid,
        dbId: doc._id,
        dbPid: doc.PID,
        dbGid: doc.GID,
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
        excelPid: pid,
        rawKeys,
      });
    }
  }

  console.log('\n=================== 匹配结果统计 ===================');
  console.log(`Excel 总数据行数: ${rawRows.length - 1}`);
  console.log(`成功匹配到的记录数: ${matchedList.length}`);
  console.log(`未匹配到的记录数: ${unmatchedList.length}`);

  if (matchedList.length > 0) {
    console.log('\n=================== 匹配到的企业明细 (部分) ===================');
    matchedList.slice(0, 10).forEach((item, idx) => {
      console.log(`${idx + 1}. [行 ${item.excelRow}] PID: ${item.excelPid} | 公司: ${item.dbNameCn} | 关键词数: ${item.keyWordsCount}`);
    });
  }

  if (bulkOperations.length > 0) {
    console.log(`\n正在批量更新 ${bulkOperations.length} 条记录到 keycustomer 表...`);
    const bulkRes = await collection.bulkWrite(bulkOperations);
    console.log(`批量更新完成！修改行数: ${bulkRes.modifiedCount}, 匹配行数: ${bulkRes.matchedCount}`);
  }

  if (unmatchedList.length > 0) {
    console.log('\n=================== 未匹配到的 PID/GID 清单 ===================');
    unmatchedList.forEach((item, index) => {
      console.log(
        `${index + 1}. [行 ${item.excelRow}] Excel PID/GID: ${item.excelPid} | KEYS: ${item.rawKeys || '无'}`
      );
    });
  } else {
    console.log('\n所有 Excel 中的 PID/GID 均在 keycustomer 表中 100% 匹配成功！');
  }

  console.log('\n正在断开数据库连接...');
  await mongoose.disconnect();
  console.log('数据库连接已安全断开。');
}

updateKeyCustomerKeyWordsFromBook1().catch((err) => {
  console.error('更新过程中发生错误:', err);
  process.exit(1);
});
