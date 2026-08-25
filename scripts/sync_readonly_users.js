require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/user.model');

// 已生成的 11 位目标用户及其固定密码和角色
const usersToCreate = [
  { name: 'Lilian', email: 'liliantian@cmi.chinamobile.com', password: 'MiE8sANfnM', role: 'readonly' },
  { name: 'Luna', email: 'lunaliunan@cmi.chinamobile.com', password: 'xWGJ2Sxfas', role: 'readonly' },
  { name: 'Tristan', email: 'tristanwang@cmi.chinamobile.com', password: 'Sd3hwu9Fr4', role: 'user' },
  { name: 'Jane', email: 'janehuang@cmi.chinamobile.com', password: 'D57eLBr2zC', role: 'readonly' },
  { name: 'Bill', email: 'billwu@cmi.chinamobile.com', password: '2se6eXFVSc', role: 'readonly' },
  { name: 'Merlin', email: 'merlinzhou@cmi.chinamobile.com', password: 'N6rTDYktK6', role: 'readonly' },
  { name: 'Aiden', email: 'aidenliu@cmi.chinamobile.com', password: 'Bk6Q7U34c3', role: 'readonly' },
  { name: 'Colton', email: 'boliecui@cmi.chinamobile.com', password: '7g49YLuftN', role: 'readonly' },
  { name: 'Monica', email: 'monicawang@cmi.chinamobile.com', password: '9CzTh2G7Tz', role: 'readonly' },
  { name: 'Connor', email: 'connorzheng@cmi.chinamobile.com', password: 'NrrG2yTjER', role: 'readonly' },
  { name: 'xiuyuan', email: 'xiuyuan.l@telelands.com', password: 'i4VaZVeVrk', role: 'readonly' },
];

async function syncUsers() {
  const mongoUrl = process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017/node-boilerplate';
  console.log(`Connecting to MongoDB: ${mongoUrl}...`);
  await mongoose.connect(mongoUrl, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  // 1. 确保超级管理员 tristan@tristan.wang 为 admin 角色
  await User.updateOne({ email: 'tristan@tristan.wang' }, { $set: { role: 'admin' } });
  console.log('Ensured tristan@tristan.wang as admin role.');

  // 2. 同步 11 位目标用户
  for (const u of usersToCreate) {
    const email = u.email.toLowerCase().trim();
    const targetRole = u.role || 'readonly';
    let user = await User.findOne({ email });
    if (user) {
      user.name = u.name;
      user.password = u.password; // pre('save') 会重新 hash 该密码
      user.role = targetRole;
      user.isEmailVerified = true;
      await user.save();
      console.log(`Updated user: ${u.name} <${email}> [${targetRole}]`);
    } else {
      user = await User.create({
        name: u.name,
        email,
        password: u.password,
        role: targetRole,
        isEmailVerified: true,
      });
      console.log(`Created user: ${u.name} <${email}> [${targetRole}]`);
    }
  }

  console.log('All 11 readonly users synchronized successfully.');
  await mongoose.disconnect();
}

syncUsers().catch((err) => {
  console.error('Error syncing users:', err);
  process.exit(1);
});
