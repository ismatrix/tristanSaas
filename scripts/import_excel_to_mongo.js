const XLSX = require('xlsx');
const mongoose = require('mongoose');
const path = require('path');

// 格式化日期对象为 YYYY-MM-DD 格式
function formatDate(val) {
  if (!(val instanceof Date)) return val;
  const year = val.getFullYear();
  const month = String(val.getMonth() + 1).padStart(2, '0');
  const date = String(val.getDate()).padStart(2, '0');
  return `${year}-${month}-${date}`;
}

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

// 读取并清洗 Excel 数据
function readExcelData(filePath, sheetName, stringCols) {
  console.log(`正在读取文件: ${filePath} (Sheet: ${sheetName})`);
  const workbook = XLSX.readFile(filePath, { cellDates: true });
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error(`找不到指定的 Sheet: ${sheetName}`);
  }
  
  // 读取所有数据行，未填充字段默认为 null
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });
  console.log(`  共读取到 ${rows.length} 条原始记录`);
  
  return rows.map((row) => {
    const cleanedRow = {};
    for (const key of Object.keys(row)) {
      if (key.startsWith('Unnamed:')) continue;
      
      const val = row[key];
      
      if (stringCols.includes(key)) {
        if (val === null || val === undefined) {
          cleanedRow[key] = key === 'parentGID' ? "" : null;
        } else {
          let valStr = String(val).trim();
          // 如果包含 .0 后缀（大数浮点化造成），安全截取掉它
          if (valStr.endsWith('.0')) {
            valStr = valStr.substring(0, valStr.length - 2);
          }
          cleanedRow[key] = valStr;
        }
      } else {
        if (val === null || val === undefined || val === '') {
          cleanedRow[key] = null;
        } else if (val instanceof Date) {
          cleanedRow[key] = formatDate(val);
        } else if (typeof val === 'number') {
          cleanedRow[key] = Number.isInteger(val) ? parseInt(val, 10) : val;
        } else {
          cleanedRow[key] = val;
        }
      }
    }
    return cleanedRow;
  });
}

async function runImport() {
  const startTime = Date.now();
  console.log('==================================================');
  console.log('  Excel 数据导入 MongoDB 脚本开始运行');
  console.log('==================================================\n');

  try {
    // 1. 连接本地 MongoDB
    await mongoose.connect('mongodb://127.0.0.1:27017/node-boilerplate', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ 本地 MongoDB 连接成功！\n');
    const db = mongoose.connection.db;

    // 2. 处理第一个文件 (keyGlobalFamilyTree)
    const data1 = readExcelData(
      '/Users/tristan/Downloads/72颗客户树总表修订版（更新部分数据枚举值错误）-20260618.xlsx',
      '出海企业客户树清单修订版',
      ['PID', 'GID', 'duns', 'ultimateGID', 'parentGID']
    );
    const fs = require('fs');
    const path = require('path');
    const regionMapPath = path.join(__dirname, 'cmi_region_map.json');
    let regionMap = {};
    if (fs.existsSync(regionMapPath)) {
      regionMap = JSON.parse(fs.readFileSync(regionMapPath, 'utf8'));
      console.log('  成功读取 cmiRegion 映射字典');
    }

    // 遍历数据并自动填充 cmiRegion 字段，并规范化 registeredCountry 大小写
    data1.forEach((row) => {
      const country = row.registeredCountry;
      if (country) {
        const isAllUpper = country === country.toUpperCase() && country !== country.toLowerCase();
        const isAllLower = country === country.toLowerCase() && country !== country.toUpperCase();
        if (isAllUpper || isAllLower) {
          row.registeredCountry = toTitleCase(country);
        }
      }

      const rawCountry = row.registeredCountry || row.position || '';
      const countryKey = String(rawCountry).trim().toLowerCase();
      row.cmiRegion = regionMap[countryKey] || null;
    });

    console.log('  正在覆盖写入数据库 [keyGlobalFamilyTree] ...');
    await db.collection('keyGlobalFamilyTree').deleteMany({});
    if (data1.length > 0) {
      const res = await db.collection('keyGlobalFamilyTree').insertMany(data1);
      console.log(`  ✅ 写入成功，共导入 ${res.insertedCount} 条记录\n`);
    } else {
      console.log('  ⚠️ 数据为空，已清空集合数据\n');
    }

    // 3. 处理第二个文件 (custContacts)
    const data2 = readExcelData(
      '/Users/tristan/Downloads/客户树联系人表更新版-20260618.xlsx',
      '客户联系人全表',
      ['ultimateGID', 'companyGId', 'duns', 'contactId', 'functionId']
    );
    console.log('  正在覆盖写入数据库 [custContacts] ...');
    await db.collection('custContacts').deleteMany({});
    if (data2.length > 0) {
      const res = await db.collection('custContacts').insertMany(data2);
      console.log(`  ✅ 写入成功，共导入 ${res.insertedCount} 条记录\n`);
    } else {
      console.log('  ⚠️ 数据为空，已清空集合数据\n');
    }

    // 4. 处理第三个文件 (keyFamilyTreeCustMapping)
    const data3 = readExcelData(
      '/Users/tristan/Downloads/存量数据匹配更新版-0618交付.xlsx',
      '1、客户树存量匹配',
      ['ultimateGID', 'GID', 'extCustId']
    );
    console.log('  正在覆盖写入数据库 [keyFamilyTreeCustMapping] ...');
    await db.collection('keyFamilyTreeCustMapping').deleteMany({});
    if (data3.length > 0) {
      const res = await db.collection('keyFamilyTreeCustMapping').insertMany(data3);
      console.log(`  ✅ 写入成功，共导入 ${res.insertedCount} 条记录\n`);
    } else {
      console.log('  ⚠️ 数据为空，已清空集合数据\n');
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('==================================================');
    console.log(`  🎉 数据覆盖导入全部成功！总耗时: ${elapsed} 秒`);
    console.log('==================================================');

  } catch (err) {
    console.error('\n❌ 导入过程中发生错误:', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n数据库连接已关闭。');
  }
}

runImport();
