const httpStatus = require('http-status');
const pick = require('../utils/pick');
const catchAsync = require('../utils/catchAsync');
const { cmiBranchService } = require('../services');

const getBranches = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['columnDesc', 'RegionCode', 'UnitCode', 'status']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await cmiBranchService.queryBranches(filter, options);
  res.send(result);
});

const updateBranch = catchAsync(async (req, res) => {
  const branch = await cmiBranchService.updateBranchById(req.params.branchId, req.body);
  res.send(branch);
});

module.exports = {
  getBranches,
  updateBranch,
};
