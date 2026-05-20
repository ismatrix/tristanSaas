const { CmiBranch } = require('../models');

/**
 * 分页查询机构分支列表
 * @param {Object} filter
 * @param {Object} options
 * @returns {Promise<QueryResult>}
 */
const queryBranches = async (filter, options) => {
  const branches = await CmiBranch.paginate(filter, options);
  return branches;
};

/**
 * 根据 ID 更新机构信息
 * @param {ObjectId} branchId
 * @param {Object} updateBody
 * @returns {Promise<CmiBranch>}
 */
const updateBranchById = async (branchId, updateBody) => {
  const branch = await CmiBranch.findById(branchId);
  if (!branch) {
    throw new Error('Branch not found');
  }
  Object.assign(branch, updateBody);
  await branch.save();
  return branch;
};

module.exports = {
  queryBranches,
  updateBranchById,
};
