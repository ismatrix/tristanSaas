require('dotenv').config();
const mongoose = require('mongoose');
const crypto = require('crypto');
const User = require('../src/models/user.model');

// 定义 11 位目标用户
const targetUsers = [
  { name: 'Lilian', email: 'liliantian@cmi.chinamobile.com' },
  { name: 'Luna', email: 'lunaliunan@cmi.chinamobile.com' },
  { name: 'Tristan', email: 'tristanwang@cmi.chinamobile.com' },
  { name: 'Jane', email: 'janehuang@cmi.chinamobile.com' },
  { name: 'Bill', email: 'billwu@cmi.chinamobile.com' },
  { name: 'Merlin', email: 'merlinzhou@cmi.chinamobile.com' },
  { name: 'Aiden', email: 'aidenliu@cmi.chinamobile.com' },
  { name: 'Colton', email: 'boliecui@cmi.chinamobile.com' },
  { name: 'Monica', email: 'monicawang@cmi.chinamobile.com' },
  { name: 'Connor', email: 'connorzheng@cmi.chinamobile.com' },
  { name: 'xiuyuan', email: 'xiuyuan.l@telelands.com' },
];

/**
 * 生成强随机密码（易读、含大小写字母和数字，长度 10）
 */
function generateRandomPassword(length = 10) {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // 去除易混淆的 I, O
  const lower = 'abcdefghijkmnpqrstuvwxyz'; // 去除易混淆的 l, o
  const numbers = '23456789'; // 去除易混淆的 0, 1
  const all = upper + lower + numbers;

  let pwd = '';
  pwd += upper[crypto.randomInt(0, upper.length)];
  pwd += lower[crypto.randomInt(0, lower.length)];
  pwd += numbers[crypto.randomInt(0, numbers.length)];

  for (let i = 3; i < length; i++) {
    pwd += all[crypto.randomInt(0, all.length)];
  }

  // 打乱字符顺序
  return pwd.split('').sort(() => 0.5 - Math.random()).join('');
}

async function createOrUpdateUsers() {
  const mongoUrl = process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017/node-boilerplate';
  console.log(`Connecting to MongoDB: ${mongoUrl}...`);
  await mongoose.connect(mongoUrl, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const results = [];

  for (const u of targetUsers) {
    const rawPassword = generateRandomPassword(10);
    const email = u.email.toLowerCase().trim();

    let user = await User.findOne({ email });
    if (user) {
      user.name = u.name;
      user.password = rawPassword; // pre('save') 会自动执行 bcrypt hash
      user.role = 'readonly';
      user.isEmailVerified = true;
      await user.save();
    } else {
      user = await User.create({
        name: u.name,
        email,
        password: rawPassword,
        role: 'readonly',
        isEmailVerified: true,
      });
    }

    results.push({
      序号: results.length + 1,
      姓名: u.name,
      登录邮箱: email,
      登录密码: rawPassword,
      用户角色: 'readonly (只读访问)',
    });
  }

  console.log('\n================== 账户创建/更新成功 ==================');
  console.table(results);
  console.log('=======================================================\n');

  // 输出 JSON 格式
  console.log('JSON 格式备份:\n', JSON.stringify(results, null, 2));

  await mongoose.disconnect();
}

createOrUpdateUsers().catch((err) => {
  console.error('Error creating users:', err);
  process.exit(1);
});
