const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const wildcardsService = require('../services/wildcards.service');

// 权限拦截助手函数：只允许特定用户修改 keycustomer 集合
const checkKeycustomerPermission = (req) => {
  if (req.params.collection === 'keycustomer') {
    if (!req.user || req.user.email !== 'tristan@tristan.wang') {
      throw new ApiError(httpStatus.FORBIDDEN, '只有 tristan@tristan.wang 用户有权限修改要客清单');
    }
  }
};

const getCollections = catchAsync(async (req, res) => {
  const collections = await wildcardsService.getCollections(req.query.prefix);
  res.send(collections);
});

const createRecord = catchAsync(async (req, res) => {
  checkKeycustomerPermission(req);
  const record = await wildcardsService.createRecord(req.params.collection, req.body);
  res.status(httpStatus.CREATED).send(record);
});

const bulkUpsert = catchAsync(async (req, res) => {
  checkKeycustomerPermission(req);
  const { records, primaryKey, clear } = req.body;
  const result = await wildcardsService.bulkUpsert(req.params.collection, records, primaryKey, clear);
  res.send(result);
});

const getRecords = catchAsync(async (req, res) => {
  let query = {};
  let projection = {};
  let options = {};
  
  try {
    if (req.query.query) query = JSON.parse(req.query.query);
    if (req.query.projection) projection = JSON.parse(req.query.projection);
    if (req.query.options) options = JSON.parse(req.query.options);
  } catch (e) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid JSON format in query parameters');
  }

  const result = await wildcardsService.getRecords(req.params.collection, query, projection, options);
  res.send(result);
});

const getRecord = catchAsync(async (req, res) => {
  const record = await wildcardsService.getRecordById(req.params.collection, req.params.id);
  res.send(record);
});

const updateRecord = catchAsync(async (req, res) => {
  checkKeycustomerPermission(req);
  const record = await wildcardsService.updateRecordById(req.params.collection, req.params.id, req.body);
  res.send(record);
});

const deleteRecord = catchAsync(async (req, res) => {
  checkKeycustomerPermission(req);
  await wildcardsService.deleteRecordById(req.params.collection, req.params.id);
  res.status(httpStatus.NO_CONTENT).send();
});

const deleteRecords = catchAsync(async (req, res) => {
  checkKeycustomerPermission(req);
  const query = req.body || {};
  console.log(`🧹 [DELETE] Collection: ${req.params.collection} | Query:`, JSON.stringify(query));
  const result = await wildcardsService.deleteRecords(req.params.collection, query);
  res.send(result);
});

module.exports = {
  getCollections,
  createRecord,
  bulkUpsert,
  getRecords,
  getRecord,
  updateRecord,
  deleteRecord,
  deleteRecords,
};

