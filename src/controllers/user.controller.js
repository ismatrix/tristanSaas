const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { userService } = require('../services');

const createUser = catchAsync(async (req, res) => {
  const user = await userService.createUser(req.body);
  res.status(httpStatus.CREATED).send(user);
});

const getUsers = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['name', 'role', 'email']);
  // 清理空字符串
  Object.keys(filter).forEach((key) => {
    if (filter[key] === '' || filter[key] === null || filter[key] === undefined) {
      delete filter[key];
    } else if (typeof filter[key] === 'string') {
      filter[key] = { $regex: filter[key], $options: 'i' };
    }
  });

  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  if (req.query.current && !options.page) options.page = parseInt(req.query.current, 10);
  if (req.query.pageSize && !options.limit) options.limit = parseInt(req.query.pageSize, 10);

  const result = await userService.queryUsers(filter, options);
  res.send(result);
});

const getUser = catchAsync(async (req, res) => {
  const user = await userService.getUserById(req.params.userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  res.send(user);
});

const updateUser = catchAsync(async (req, res) => {
  const user = await userService.updateUserById(req.params.userId, req.body);
  res.send(user);
});

const deleteUser = catchAsync(async (req, res) => {
  await userService.deleteUserById(req.params.userId);
  res.status(httpStatus.NO_CONTENT).send();
});

const forceLogoutUser = catchAsync(async (req, res) => {
  const user = await userService.forceLogoutUserById(req.params.userId);
  res.send({ success: true, message: '用户已被强制登出，其当前 Session 已失效', user });
});

const resetUserPassword = catchAsync(async (req, res) => {
  const { user, newPassword } = await userService.resetPasswordById(req.params.userId);
  res.send({ success: true, message: '密码已成功重置', newPassword, user });
});

module.exports = {
  createUser,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  forceLogoutUser,
  resetUserPassword,
};
