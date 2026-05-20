const httpStatus = require('http-status');
const { ContractDetail } = require('../models');
const ApiError = require('../utils/ApiError');

/**
 * 创建合同详情
 * @param {Object} body
 * @returns {Promise<ContractDetail>}
 */
const createContractDetail = async (body) => {
  if (await ContractDetail.findOne({ uuid: body.uuid })) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'uuid already exists');
  }
  return ContractDetail.create(body);
};

/**
 * 分页查询合同详情列表
 * @param {Object} filter
 * @param {Object} options
 * @returns {Promise<QueryResult>}
 */
const queryContractDetails = async (filter, options) => {
  const contractDetails = await ContractDetail.paginate(filter, options);
  return contractDetails;
};

/**
 * 通过id获取合同详情
 * @param {ObjectId} id
 * @returns {Promise<ContractDetail>}
 */
const getContractDetailById = async (id) => {
  return ContractDetail.findById(id);
};

/**
 * 通过id更新合同详情
 * @param {ObjectId} id
 * @param {Object} updateBody
 * @returns {Promise<ContractDetail>}
 */
const updateContractDetailById = async (id, updateBody) => {
  const contractDetail = await getContractDetailById(id);
  if (!contractDetail) {
    throw new ApiError(httpStatus.NOT_FOUND, 'ContractDetail not found');
  }
  if (updateBody.uuid && (await ContractDetail.findOne({ uuid: updateBody.uuid, _id: { $ne: id } }))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'uuid already exists');
  }
  Object.assign(contractDetail, updateBody);
  await contractDetail.save();
  return contractDetail;
};

/**
 * 批量插入或更新合同详情
 * 依据 uuid，如果存在就更新（upsert=true），如果不存在就插入。
 * @param {Array<Object>} docsArray
 * @returns {Promise<Object>}
 */
const bulkUpsertContractDetails = async (docsArray) => {
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

  const result = await ContractDetail.bulkWrite(bulkOps);

  return {
    nUpserted: result.upsertedCount,
    nModified: result.modifiedCount,
    nMatched: result.matchedCount,
  };
};

/**
 * 通过id删除合同详情
 * @param {ObjectId} id
 * @returns {Promise<ContractDetail>}
 */
const deleteContractDetailById = async (id) => {
  const contractDetail = await getContractDetailById(id);
  if (!contractDetail) {
    throw new ApiError(httpStatus.NOT_FOUND, 'ContractDetail not found');
  }
  await contractDetail.remove();
  return contractDetail;
};

module.exports = {
  createContractDetail,
  queryContractDetails,
  getContractDetailById,
  updateContractDetailById,
  deleteContractDetailById,
  bulkUpsertContractDetails,
};
