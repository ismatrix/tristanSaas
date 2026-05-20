const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { contractDetailService } = require('../services');

const createContractDetail = catchAsync(async (req, res) => {
  const contractDetail = await contractDetailService.createContractDetail(req.body);
  res.status(httpStatus.CREATED).send(contractDetail);
});

const getContractDetails = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['uuid']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await contractDetailService.queryContractDetails(filter, options);
  res.send(result);
});

const getContractDetail = catchAsync(async (req, res) => {
  const contractDetail = await contractDetailService.getContractDetailById(req.params.contractDetailId);
  if (!contractDetail) {
    throw new ApiError(httpStatus.NOT_FOUND, 'ContractDetail not found');
  }
  res.send(contractDetail);
});

const updateContractDetail = catchAsync(async (req, res) => {
  const contractDetail = await contractDetailService.updateContractDetailById(req.params.contractDetailId, req.body);
  res.send(contractDetail);
});

const deleteContractDetail = catchAsync(async (req, res) => {
  await contractDetailService.deleteContractDetailById(req.params.contractDetailId);
  res.status(httpStatus.NO_CONTENT).send();
});

const bulkUpsertContractDetails = catchAsync(async (req, res) => {
  const result = await contractDetailService.bulkUpsertContractDetails(req.body);
  res.status(httpStatus.OK).send({
    message: '批量处理成功',
    ...result
  });
});

module.exports = {
  createContractDetail,
  getContractDetails,
  getContractDetail,
  updateContractDetail,
  deleteContractDetail,
  bulkUpsertContractDetails,
};
