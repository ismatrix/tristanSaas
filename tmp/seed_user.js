const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
const UserModule = require('../src/models/user.model');

const User = mongoose.model('User');

const seed = async () => {
  await mongoose.connect('mongodb://127.0.0.1:27017/node-boilerplate');
  console.log('Connected to MongoDB');

  const user = {
    name: 'tristan',
    email: 'tristan@example.com',
    password: '123456',
    role: 'user',
    isEmailVerified: true
  };

  await User.deleteMany({ email: 'tristan@example.com' });
  await User.create(user);
  console.log('User tristan@example.com created with password 123456');
  
  process.exit(0);
};

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
