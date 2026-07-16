require('dotenv').config();
const mongoose = require('mongoose');
const xlsx = require('xlsx');

const schema = new mongoose.Schema({}, { strict: false });
const KeyGlobalFamilyTree = mongoose.model('keyGlobalFamilyTree', schema, 'keyGlobalFamilyTree');

async function doImport() {
  const filePath = process.argv[2] || '/Users/tristan/Downloads/72颗客户树总表修订版（修改末梢site）-20260715.xlsx';
  const mongoUrl = process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017/node-boilerplate';

  console.log('开始连接 MongoDB 数据库...');
  await mongoose.connect(mongoUrl, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
  console.log('数据库连接成功。');

  console.log(`正在读取 Excel 文件: ${filePath}`);
  const workbook = xlsx.readFile(filePath);
  
  // 智能匹配工作表名称
  let sheetName = '出海企业客户树清单修订版';
  const foundSheet = workbook.SheetNames.find(name => 
    name.toLowerCase() === 'sheet1' || name === '出海企业客户树清单修订版'
  );
  if (foundSheet) {
    sheetName = foundSheet;
  } else {
    sheetName = workbook.SheetNames[0];
  }
  console.log(`获取并决定使用工作表: ${sheetName}`);

  const fs = require('fs');
  const path = require('path');

  const rawData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
  console.log(`Excel 解析成功，共 ${rawData.length} 条记录。`);

  // 加载 cmiRegion 映射字典
  const regionMapPath = path.join(__dirname, 'scripts', 'cmi_region_map.json');
  let regionMap = {};
  if (fs.existsSync(regionMapPath)) {
    regionMap = JSON.parse(fs.readFileSync(regionMapPath, 'utf8'));
    console.log('成功读取 cmiRegion 映射字典。');
  } else {
    console.log('警告：cmiRegion 映射字典不存在。');
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

  // 遍历数据并自动填充 cmiRegion 字段，同时清洗 registeredCountry 大小写
  rawData.forEach((row) => {
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

  console.log('正在执行覆盖导入（清空历史数据）...');
  const delRes = await KeyGlobalFamilyTree.deleteMany({});
  console.log(`成功删除历史数据共 ${delRes.deletedCount} 条。`);

  if (rawData.length > 0) {
    console.log('正在向数据库写入新记录...');
    const insertRes = await KeyGlobalFamilyTree.insertMany(rawData);
    console.log(`成功写入数据库记录共 ${insertRes.length} 条。`);
  } else {
    console.log('Excel 数据为空，未写入新记录。');
  }

  console.log('数据导入任务顺利完成，正在断开数据库连接...');
  await mongoose.disconnect();
  console.log('已安全断开数据库连接。');
}

doImport().catch(err => {
  console.error('导入过程中发生致命错误:', err);
  process.exit(1);
});
