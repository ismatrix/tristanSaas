const httpStatus = require('http-status');
const pick = require('../utils/pick');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const { cmiBranchService } = require('../services');

const getBranches = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['columnDesc', 'RegionCode', 'UnitCode', 'status']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await cmiBranchService.queryBranches(filter, options);
  res.send(result);
});

const updateBranch = catchAsync(async (req, res) => {
  if (!req.user || req.user.email !== 'tristan@tristan.wang') {
    throw new ApiError(httpStatus.FORBIDDEN, '只有 tristan@tristan.wang 用户有权限修改区域单元');
  }
  const branch = await cmiBranchService.updateBranchById(req.params.branchId, req.body);
  res.send(branch);
});

module.exports = {
  getBranches,
  updateBranch,
};

