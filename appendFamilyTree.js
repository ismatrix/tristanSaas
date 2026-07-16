require('dotenv').config();
const mongoose = require('mongoose');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const schema = new mongoose.Schema({}, { strict: false });
// 绑定现有的 keyGlobalFamilyTree 集合
const KeyGlobalFamilyTree = mongoose.model('keyGlobalFamilyTree', schema, 'keyGlobalFamilyTree');

async function doAppendImport() {
  const filePath = process.argv[2] || '/Users/tristan/Downloads/420943581_CECEP-260716(合并子公司独立客户树).xlsx';
  const mongoUrl = process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017/node-boilerplate';

  console.log('开始连接 MongoDB 数据库...');
  await mongoose.connect(mongoUrl, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
  console.log('数据库连接成功。');

  console.log(`正在读取 Excel 文件: ${filePath}`);
  const workbook = xlsx.readFile(filePath);
  
  // 默认使用第一个工作表
  const sheetName = workbook.SheetNames[0];
  console.log(`确定使用工作表: ${sheetName}`);

  const rawData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
  console.log(`Excel 解析成功，共读取到 ${rawData.length} 条记录。`);

  if (rawData.length === 0) {
    console.log('未找到任何记录，退出导入。');
    await mongoose.disconnect();
    return;
  }

  // 加载 cmiRegion 映射字典以规范化区域分类
  const regionMapPath = path.join(__dirname, 'scripts', 'cmi_region_map.json');
  let regionMap = {};
  if (fs.existsSync(regionMapPath)) {
    regionMap = JSON.parse(fs.readFileSync(regionMapPath, 'utf8'));
    console.log('成功加载 cmiRegion 映射字典。');
  } else {
    console.log('警告：scripts/cmi_region_map.json 映射字典未找到，将无法自动匹配 cmiRegion 字段。');
  }

  // 将国家名称规范化为 Title Case（例如: "china" -> "China"）
  function toTitleCase(str) {
    if (!str) return str;
    return str.split(' ').map(word => {
      if (!word) return '';
      return word.replace(/[a-zA-Z]+/g, (match) => {
        return match.charAt(0).toUpperCase() + match.slice(1).toLowerCase();
      });
    }).join(' ');
  }

  // 整理所有涉及到的 ultimateGID，并在写入前把旧的数据删除以防重复写入
  const ultimateGIDs = new Set();

  // 规范化处理每一条数据
  rawData.forEach((row) => {
    // 处理国家字样
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

    // 收集 ultimateGID 属性
    if (row.ultimateGID) {
      ultimateGIDs.add(String(row.ultimateGID).trim());
    }
  });

  const ultimateGIDArray = Array.from(ultimateGIDs);
  console.log(`本次数据包含 of ultimateGID 列表:`, ultimateGIDArray);

  if (ultimateGIDArray.length > 0) {
    console.log(`正在删除数据库中这批 ultimateGID (${ultimateGIDArray.join(', ')}) 已有的重复记录...`);
    const delRes = await KeyGlobalFamilyTree.deleteMany({
      ultimateGID: { $in: ultimateGIDArray }
    });
    console.log(`成功清理已有重复记录共 ${delRes.deletedCount} 条。`);
  }

  console.log('正在将新数据追加写入 keyGlobalFamilyTree 集合中...');
  const insertRes = await KeyGlobalFamilyTree.insertMany(rawData);
  console.log(`成功追加写入数据库记录共 ${insertRes.length} 条。`);

  console.log('数据导入任务已完成，正在断开数据库连接...');
  await mongoose.disconnect();
  console.log('已安全断开数据库连接。');
}

doAppendImport().catch(err => {
  console.error('追加导入过程中发生致命错误:', err);
  process.exit(1);
});
