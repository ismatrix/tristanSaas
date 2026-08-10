require('dotenv').config();
const mongoose = require('mongoose');
const xlsx = require('xlsx');

const EXCEL_PATH = '/Users/tristan/Downloads/Book1.xlsx';

async function processBook1() {
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

  // 寻找 PID/GID 列 和 KEYS 列的索引
  let pidIndex = -1;
  let gidIndex = -1;
  let keysIndex = -1;

  header.forEach((colName, idx) => {
    if (!colName) return;
    const nameStr = String(colName).trim().toUpperCase();
    if (nameStr === 'PID') pidIndex = idx;
    if (nameStr === 'GID') gidIndex = idx;
    if (nameStr === 'KEYS' || nameStr === 'KEY' || nameStr === 'KEYWORDS') keysIndex = idx;
  });

  console.log(`找到列索引 -> PID: ${pidIndex}, GID: ${gidIndex}, KEYS: ${keysIndex}`);

  // 打印前5行数据观察
  for (let i = 1; i < Math.min(rawRows.length, 6); i++) {
    console.log(`第 ${i + 1} 行:`, rawRows[i]);
  }

  await mongoose.disconnect();
}

processBook1().catch((err) => {
  console.error('处理出错:', err);
  process.exit(1);
});
