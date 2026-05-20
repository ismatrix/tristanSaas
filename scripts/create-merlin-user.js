/**
 * 一次性脚本：创建用户 merlin
 * 用法：node scripts/create-merlin-user.js
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const config = require('../src/config/config');

async function createUser() {
  // 连接 MongoDB
  await mongoose.connect(config.mongoose.url, config.mongoose.options);
  console.log('已连接到 MongoDB');

  // 动态加载 User 模型
  const { User } = require('../src/models');

  // 检查是否已存在
  const existing = await User.findOne({ email: 'merlin@example.com' });
  if (existing) {
    console.log('用户 merlin 已存在，跳过创建。');
    await mongoose.disconnect();
    return;
  }

  // 创建用户（密码通过 pre-save hook 自动 hash）
  const user = await User.create({
    name: 'merlin',
    email: 'merlin@example.com',
    password: '123456',
    role: 'user',
  });

  console.log('用户 merlin 创建成功：', {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  });

  await mongoose.disconnect();
  console.log('数据库连接已关闭');
}

createUser().catch((err) => {
  console.error('创建用户失败：', err);
  process.exit(1);
});
