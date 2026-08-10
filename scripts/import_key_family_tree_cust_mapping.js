require('dotenv').config();
const mongoose = require('mongoose');
const xlsx = require('xlsx');

// Excel 文件路径
const EXCEL_PATH = '/Users/tristan/Downloads/存量数据匹配(更新英文完全匹配bug，更新国内分支匹配)-260806.xlsx';

async function importCustMapping() {
  const mongoUrl = process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017/node-boilerplate';
  console.log('正在连接 MongoDB 数据库...');
  await mongoose.connect(mongoUrl, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log('数据库连接成功。');

  const db = mongoose.connection.db;
  const collection = db.collection('keyFamilyTreeCustMapping');

  // 查询清理前的原有数据条数
  const oldCount = await collection.countDocuments();
  console.log(`当前 keyFamilyTreeCustMapping 表中原有记录数: ${oldCount}`);

  console.log(`正在读取 Excel 文件: ${EXCEL_PATH}`);
  const workbook = xlsx.readFile(EXCEL_PATH);
  const sheetName = workbook.SheetNames[0]; // '1、客户树存量custId匹配'
  console.log(`使用工作表: ${sheetName}`);

  const rawRows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
  if (!rawRows || rawRows.length <= 1) {
    console.log('Excel 中没有有效数据，退出导入。');
    await mongoose.disconnect();
    return;
  }

  const header = rawRows[0];
  console.log('Excel 表头（前 5 列）:', header.slice(0, 5));

  const records = [];
  for (let i = 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!row || row.length === 0) continue;

    // 提取 A ~ E 列
    const ultimateGID = row[0] != null ? String(row[0]).trim() : '';
    const GID = row[1] != null ? String(row[1]).trim() : '';
    const extCustId = row[2] != null ? String(row[2]).trim() : '';
    const mappingPath = row[3] != null ? String(row[3]).trim() : '';
    const companyId = row[4] != null ? String(row[4]).trim() : '';

    // 跳过无有效 GID / ultimateGID 的空行
    if (!ultimateGID && !GID) continue;

    const doc = {};
    if (ultimateGID) doc.ultimateGID = ultimateGID;
    if (GID) doc.GID = GID;
    if (extCustId) doc.extCustId = extCustId;
    if (mappingPath) doc.mappingPath = mappingPath;
    if (companyId) doc.companyId = companyId;

    records.push(doc);
  }

  console.log(`\n=================== 数据解析结果 ===================`);
  console.log(`Excel 行数（不含表头）: ${rawRows.length - 1}`);
  console.log(`解析出的有效映射记录数: ${records.length}`);

  if (records.length === 0) {
    console.log('解析后记录数为 0，未执行覆盖导入。');
    await mongoose.disconnect();
    return;
  }

  console.log(`\n正在覆盖导入：开始清空旧数据...`);
  const delRes = await collection.deleteMany({});
  console.log(`已成功清理原有的 ${delRes.deletedCount} 条记录。`);

  console.log(`正在批量写入 ${records.length} 条新数据...`);
  const insertRes = await collection.insertMany(records);
  console.log(`覆盖导入成功！共写入 ${insertRes.insertedCount} 条记录。`);

  const newCount = await collection.countDocuments();
  console.log(`最新 keyFamilyTreeCustMapping 表记录总数: ${newCount}`);

  console.log('\n正在断开数据库连接...');
  await mongoose.disconnect();
  console.log('数据库连接已安全断开。');
}

importCustMapping().catch((err) => {
  console.error('导入过程中发生错误:', err);
  process.exit(1);
});
