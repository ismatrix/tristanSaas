const XLSX = require('xlsx');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const config = require('../src/config/config');

// 将字符串规范化为首字母大写、其余小写的 Title Case 格式
function toTitleCase(str) {
  if (!str) return str;
  return str.split(' ').map(word => {
    if (!word) return '';
    return word.replace(/[a-zA-Z]+/g, (match) => {
      return match.charAt(0).toUpperCase() + match.slice(1).toLowerCase();
    });
  }).join(' ');
}

// 格式化日期对象为 YYYY-MM-DD 格式
function formatDate(val) {
  if (!(val instanceof Date)) return val;
  const year = val.getFullYear();
  const month = String(val.getMonth() + 1).padStart(2, '0');
  const date = String(val.getDate()).padStart(2, '0');
  return `${year}-${month}-${date}`;
}

async function runAppendImport() {
  const filePath = '/Users/tristan/Downloads/第二批数据-54颗客户树初版-0730(1).xlsx';
  const sheetName = 'DBS原始数据';
  const stringCols = ['PID', 'GID', 'duns', 'ultimateGID', 'parentGID', 'registrationNumber'];

  console.log(`正在读取 Excel: ${filePath} (Sheet: ${sheetName})...`);
  const workbook = XLSX.readFile(filePath, { cellDates: true });
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error(`找不到指定的 Sheet: ${sheetName}`);
  }

  const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: null });
  console.log(`Excel 中共读取到 ${rawRows.length} 条数据`);

  const regionMapPath = path.join(__dirname, 'cmi_region_map.json');
  let regionMap = {};
  if (fs.existsSync(regionMapPath)) {
    regionMap = JSON.parse(fs.readFileSync(regionMapPath, 'utf8'));
    console.log('成功读取 cmiRegion 映射字典');
  }

  const formattedDocs = rawRows.map(row => {
    const doc = {};
    for (const key of Object.keys(row)) {
      if (!key || key.startsWith('Unnamed:')) continue;
      const val = row[key];

      if (stringCols.includes(key)) {
        if (val === null || val === undefined) {
          doc[key] = key === 'parentGID' ? '' : null;
        } else {
          let valStr = String(val).trim();
          if (valStr.endsWith('.0')) {
            valStr = valStr.substring(0, valStr.length - 2);
          }
          doc[key] = valStr;
        }
      } else {
        if (val === null || val === undefined || val === '') {
          doc[key] = null;
        } else if (val instanceof Date) {
          doc[key] = formatDate(val);
        } else if (typeof val === 'number') {
          doc[key] = Number.isInteger(val) ? parseInt(val, 10) : val;
        } else {
          doc[key] = val;
        }
      }
    }

    // 规范化 registeredCountry 大小写并计算 cmiRegion
    const country = doc.registeredCountry;
    if (country) {
      const isAllUpper = country === country.toUpperCase() && country !== country.toLowerCase();
      const isAllLower = country === country.toLowerCase() && country !== country.toUpperCase();
      if (isAllUpper || isAllLower) {
        doc.registeredCountry = toTitleCase(country);
      }
    }

    const rawCountry = doc.registeredCountry || doc.position || '';
    const countryKey = String(rawCountry).trim().toLowerCase();
    doc.cmiRegion = regionMap[countryKey] || null;

    if (!doc.dataSource) {
      doc.dataSource = 'DBS';
    }

    return doc;
  });

  console.log(`清洗完成，准备追加写入 MongoDB keyGlobalFamilyTree 集合...`);

  await mongoose.connect(config.mongoose.url, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const db = mongoose.connection.db;
  const countBefore = await db.collection('keyGlobalFamilyTree').countDocuments();
  console.log(`写入前 keyGlobalFamilyTree 记录数: ${countBefore}`);

  // 追加写入
  const insertResult = await db.collection('keyGlobalFamilyTree').insertMany(formattedDocs);
  console.log(`✅ 成功追加写入 ${insertResult.insertedCount} 条记录！`);

  const countAfter = await db.collection('keyGlobalFamilyTree').countDocuments();
  console.log(`写入后 keyGlobalFamilyTree 总记录数: ${countAfter}`);

  // 统计 CMI 和各 ultimateGID 的分布
  const ultGidCount = await db.collection('keyGlobalFamilyTree').aggregate([
    { $group: { _id: '$ultimateGID', total: { $sum: 1 } } }
  ]).toArray();
  console.log(`目前家族树根节点总数 (不同 ultimateGID 数): ${ultGidCount.length}`);

  await mongoose.disconnect();
  console.log('MongoDB 连接已断开。');
}

runAppendImport().catch(err => {
  console.error('导入发生异常:', err);
  process.exit(1);
});
