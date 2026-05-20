const mongoose = require('mongoose');
const moment = require('moment');
const jwt = require('jsonwebtoken');

// 强制注入 NODE_ENV，以防单独运行脚本时报错
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
}

const config = require('../src/config/config');
const { User } = require('../src/models');
const { tokenTypes } = require('../src/config/tokens');


mongoose.connect(config.mongoose.url, config.mongoose.options).then(async () => {
  console.log('Connected to MongoDB');

  // 1. 获取或创建 admin 用户
  let adminUser = await User.findOne({ role: 'admin' });
  if (!adminUser) {
    adminUser = await User.create({
      name: 'SuperAdmin',
      email: 'admin@system.local',
      password: 'Password1!',
      role: 'admin',
      isEmailVerified: true
    });
    console.log('Created a default admin user: admin@system.local');
  }

  // 2. 生成一个十年有效期的超级 Token 用于脚本调用
  const expires = moment().add(10, 'years');
  const payload = {
    sub: adminUser.id,
    iat: moment().unix(),
    exp: expires.unix(),
    type: tokenTypes.ACCESS,
  };
  const token = jwt.sign(payload, config.jwt.secret);

  console.log('\n======================================================');
  console.log('请在“油猴”脚本中使用以下 Bearer Token 并在调用时加入 HTTP Header:');
  console.log(`Authorization: Bearer ${token}`);
  console.log('======================================================\n');

  process.exit(0);
});
