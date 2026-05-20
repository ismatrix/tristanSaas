const httpStatus = require('http-status');
const { Contract } = require('../models');
const ApiError = require('../utils/ApiError');

/**
 * 创建合同
 * @param {Object} contractBody
 * @returns {Promise<Contract>}
 */
const createContract = async (contractBody) => {
  if (await Contract.findOne({ uuid: contractBody.uuid })) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'uuid already exists');
  }
  return Contract.create(contractBody);
};

/**
 * 分页查询合同列表
 * @param {Object} filter
 * @param {Object} options
 * @returns {Promise<QueryResult>}
 */
const queryContracts = async (filter, options) => {
  const contracts = await Contract.paginate(filter, options);
  return contracts;
};

/**
 * 通过id获取合同
 * @param {ObjectId} id
 * @returns {Promise<Contract>}
 */
const getContractById = async (id) => {
  return Contract.findById(id);
};

/**
 * 通过id更新合同
 * @param {ObjectId} contractId
 * @param {Object} updateBody
 * @returns {Promise<Contract>}
 */
const updateContractById = async (contractId, updateBody) => {
  const contract = await getContractById(contractId);
  if (!contract) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Contract not found');
  }
  if (updateBody.uuid && (await Contract.findOne({ uuid: updateBody.uuid, _id: { $ne: contractId } }))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'uuid already exists');
  }
  Object.assign(contract, updateBody);
  await contract.save();
  return contract;
};

/**
 * 批量插入或更新合同
 * 依据 uuid，如果存在就更新（upsert=true），如果不存在就插入。
 * @param {Array<Object>} docsArray - 前端传入的合同对象数组
 * @returns {Promise<Object>}
 */
const bulkUpsertContracts = async (docsArray) => {
  if (!docsArray || !docsArray.length) {
    return { nUpserted: 0, nModified: 0 };
  }

  const bulkOps = docsArray.map(doc => ({
    updateOne: {
      filter: { uuid: doc.uuid },
      update: { $set: doc },
      upsert: true
    }
  }));

  const result = await Contract.bulkWrite(bulkOps);

  return {
    nUpserted: result.upsertedCount,
    nModified: result.modifiedCount,
    nMatched: result.matchedCount,
  };
};

/**
 * 通过id删除合同
 * @param {ObjectId} contractId
 * @returns {Promise<Contract>}
 */
const deleteContractById = async (contractId) => {
  const contract = await getContractById(contractId);
  if (!contract) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Contract not found');
  }
  await contract.remove();
  return contract;
};

module.exports = {
  createContract,
  queryContracts,
  getContractById,
  updateContractById,
  deleteContractById,
  bulkUpsertContracts,
};
