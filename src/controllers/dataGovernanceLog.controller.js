const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const dataGovernanceLogService = require('../services/dataGovernanceLog.service');

const upsertGovernanceLog = catchAsync(async (req, res) => {
  const result = await dataGovernanceLogService.upsertLog(req.body);
  res.status(httpStatus.OK).send({
    code: 200,
    message: '保存治理日志成功',
    data: result,
  });
});

const getGovernanceLogs = catchAsync(async (req, res) => {
  const filter = {
    rootGID: req.query.rootGID,
    companyId: req.query.companyId,
    custId: req.query.custId,
  };
  const result = await dataGovernanceLogService.getLogsByFilter(filter);
  res.status(httpStatus.OK).send({
    code: 200,
    message: '查询治理日志成功',
    data: result,
  });
});

const deleteGovernanceLog = catchAsync(async (req, res) => {
  const filter = {
    rootGID: req.body?.rootGID || req.query.rootGID,
    companyId: req.body?.companyId || req.query.companyId,
    custId: req.body?.custId || req.query.custId,
  };
  const result = await dataGovernanceLogService.deleteLog(filter);
  res.status(httpStatus.OK).send({
    code: 200,
    message: '删除治理日志成功',
    data: result,
  });
});

module.exports = {
  upsertGovernanceLog,
  getGovernanceLogs,
  deleteGovernanceLog,
};
