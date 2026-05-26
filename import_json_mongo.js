const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

// 获取 Downloads 目录下的目标 JSON 文件夹
const sourceDir = path.join(process.env.HOME || '/Users/tristan', 'Downloads', 'data_nofilter_all_columns');
const mongoUrl = process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017/node-boilerplate';

async function main() {
  console.log('正在连接本地 MongoDB...');
  await mongoose.connect(mongoUrl, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log('MongoDB 连接成功。');

  const db = mongoose.connection.db;

  // 1. 读取源目录下的所有文件
  if (!fs.existsSync(sourceDir)) {
    console.error(`错误：源目录不存在: ${sourceDir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(sourceDir).filter(f => f.endsWith('.json'));
  console.log(`共发现 ${files.length} 个 JSON 文件。`);

  let successCount = 0;
  let failCount = 0;

  for (const file of files) {
    const filePath = path.join(sourceDir, file);
    
    // 解析文件名，格式类似于：{duns}_{nameCn}_*.json
    const parts = file.split('_');
    if (parts.length < 2) {
      console.warn(`[跳过] 文件名格式不匹配，无法解析 duns 和 nameCn: ${file}`);
      continue;
    }
    
    const dunsStr = parts[0];
    const nameCn = parts[1];
    
    // 3. 在 keycustomer 集合中寻找对应记录以匹配 abbr
    let customer = null;
    
    // 优先使用 duns 进行数字匹配（因为数据库中 globalUltimateDuns 是 Number 类型）
    const dunsInt = parseInt(dunsStr, 10);
    if (!isNaN(dunsInt)) {
      customer = await db.collection('keycustomer').findOne({ globalUltimateDuns: dunsInt });
    }
    
    // 匹配不到则使用 nameCn 进行匹配
    if (!customer && nameCn) {
      customer = await db.collection('keycustomer').findOne({ nameCn: nameCn });
    }
    
    // 确定 abbr
    let abbr = '';
    if (customer && customer.abbr) {
      abbr = customer.abbr;
      console.log(`[匹配成功] 文件 ${file} 匹配到客户简写 abbr: ${abbr}`);
    } else {
      // 仍然匹配不到，则回退为文件名中的 nameCn 自定义简写
      abbr = nameCn;
      console.log(`[未匹配到] 文件 ${file} 在 keycustomer 中未找到记录，将直接使用中文名称 "${nameCn}" 作为 abbr。`);
    }
    
    // 4. 拼接目标表名：DNBWebFamilyTree-{abbr}-{duns}
    const tableName = `DNBWebFamilyTree-${abbr}-${dunsStr}`;
    console.log(`正在处理：${file} => 导入到表：${tableName}`);
    
    try {
      // 读取并解析文件内容
      const content = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(content);
      
      if (!Array.isArray(data)) {
        console.error(`[错误] 文件内容不是 JSON 数组，跳过: ${file}`);
        failCount++;
        continue;
      }
      
      // 5. 写入数据库
      // 导入前先清空旧数据
      await db.collection(tableName).deleteMany({});
      if (data.length > 0) {
        await db.collection(tableName).insertMany(data);
      }
      
      console.log(`[成功] 已导入 ${data.length} 条数据到表 ${tableName}`);
      successCount++;
    } catch (err) {
      console.error(`[异常] 导入文件 ${file} 时出错:`, err.message);
      failCount++;
    }
  }

  console.log(`\n数据导入完成！成功: ${successCount} 个，失败: ${failCount} 个。`);
  await mongoose.disconnect();
}

main().catch(err => {
  console.error('全局运行异常:', err);
  process.exit(1);
});
