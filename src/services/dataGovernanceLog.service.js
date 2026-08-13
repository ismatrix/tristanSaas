const DataGovernanceLog = require('../models/dataGovernanceLog.model');

/**
 * 更新或创建一条治理日志记录 (Upsert)
 * @param {Object} logBody
 * @returns {Promise<DataGovernanceLog>}
 */
const upsertLog = async (logBody) => {
  const { rootGID, companyId = '', custId = '', notes = '', staff = '', status = 'no' } = logBody;

  if (!rootGID) {
    throw new Error('rootGID 不能为空');
  }

  // 构造精确匹配查询条件
  const filter = { rootGID };
  if (companyId && companyId.trim() !== '') {
    filter.companyId = companyId.trim();
  } else if (custId && custId.trim() !== '') {
    filter.custId = custId.trim();
  } else {
    throw new Error('companyId 或 custId 必须至少填入一项');
  }

  const update = {
    rootGID,
    companyId: companyId ? companyId.trim() : '',
    custId: custId ? custId.trim() : '',
    status: status || 'no',
    notes,
    staff,
    updateAt: new Date(),
  };

  const options = { upsert: true, new: true, setDefaultsOnInsert: true };

  const logRecord = await DataGovernanceLog.findOneAndUpdate(filter, update, options);
  return logRecord;
};

/**
 * 根据 rootGID (及可选的 companyId/custId) 获取治理日志列表
 * @param {Object} filter
 * @returns {Promise<Array<DataGovernanceLog>>}
 */
const getLogsByFilter = async (filter) => {
  const query = {};
  if (filter.rootGID) {
    query.rootGID = filter.rootGID;
  }
  if (filter.companyId) {
    query.companyId = filter.companyId;
  }
  if (filter.custId) {
    query.custId = filter.custId;
  }

  const logs = await DataGovernanceLog.find(query).lean();
  return logs;
};

/**
 * 删除一条治理日志记录
 * @param {Object} filterBody
 * @returns {Promise<Object>}
 */
const deleteLog = async (filterBody) => {
  const { rootGID, companyId = '', custId = '' } = filterBody;

  if (!rootGID) {
    throw new Error('rootGID 不能为空');
  }

  const filter = { rootGID };
  if (companyId && companyId.trim() !== '') {
    filter.companyId = companyId.trim();
  } else if (custId && custId.trim() !== '') {
    filter.custId = custId.trim();
  } else {
    throw new Error('companyId 或 custId 必须至少填入一项');
  }

  const result = await DataGovernanceLog.deleteMany(filter);
  return result;
};

module.exports = {
  upsertLog,
  getLogsByFilter,
  deleteLog,
};
