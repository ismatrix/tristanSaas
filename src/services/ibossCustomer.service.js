const { IBossCustomer } = require('../models');

/**
 * 批量插入或更新客户信息
 * @param {Array<Object>} customersArray
 * @returns {Promise<Object>}
 */
const bulkUpsertCustomers = async (customersArray) => {
  if (!customersArray || !customersArray.length) {
    return { nUpserted: 0, nModified: 0 };
  }

  const bulkOps = customersArray.map((cust) => ({
    updateOne: {
      filter: { custId: cust.custId },
      update: { $set: cust },
      upsert: true,
    },
  }));

  const result = await IBossCustomer.bulkWrite(bulkOps);

  return {
    nUpserted: result.upsertedCount,
    nModified: result.modifiedCount,
    nMatched: result.matchedCount,
  };
};

/**
 * 查询客户列表
 * @param {Object} filter
 * @param {Object} options
 * @returns {Promise<QueryResult>}
 */
const queryCustomers = async (filter, options) => {
  const result = await IBossCustomer.paginate(filter, options);
  return result;
};

module.exports = {
  bulkUpsertCustomers,
  queryCustomers,
};
