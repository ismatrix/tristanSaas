const httpStatus = require('http-status');
const { OrderDetail } = require('../models');
const ApiError = require('../utils/ApiError');

/**
 * 创建订单详情
 * @param {Object} orderDetailBody
 * @returns {Promise<OrderDetail>}
 */
const createOrderDetail = async (orderDetailBody) => {
  if (await OrderDetail.findOne({ handleId: orderDetailBody.handleId })) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'handleId already exists');
  }
  return OrderDetail.create(orderDetailBody);
};

/**
 * 分页查询列表
 * @param {Object} filter
 * @param {Object} options
 * @returns {Promise<QueryResult>}
 */
const queryOrderDetails = async (filter, options) => {
  const orderDetails = await OrderDetail.paginate(filter, options);
  return orderDetails;
};

/**
 * 通过id获取订单详情
 * @param {ObjectId} id
 * @returns {Promise<OrderDetail>}
 */
const getOrderDetailById = async (id) => {
  return OrderDetail.findById(id);
};

/**
 * 通过id更新订单详情
 * @param {ObjectId} orderDetailId
 * @param {Object} updateBody
 * @returns {Promise<OrderDetail>}
 */
const updateOrderDetailById = async (orderDetailId, updateBody) => {
  const orderDetail = await getOrderDetailById(orderDetailId);
  if (!orderDetail) {
    throw new ApiError(httpStatus.NOT_FOUND, 'OrderDetail not found');
  }
  if (updateBody.handleId && (await OrderDetail.findOne({ handleId: updateBody.handleId, _id: { $ne: orderDetailId } }))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'handleId already exists');
  }
  Object.assign(orderDetail, updateBody);
  await orderDetail.save();
  return orderDetail;
};

/**
 * 批量插入或更新订单详情
 * 依据 handleId，如果存在就更新（upsert=true），如果不存在就插入。
 * @param {Array<Object>} docsArray - 前端传入的对象数组
 * @returns {Promise<Object>}
 */
const bulkUpsertOrderDetails = async (docsArray) => {
  if (!docsArray || !docsArray.length) {
    return { nUpserted: 0, nModified: 0 };
  }

  const bulkOps = docsArray.map(doc => ({
    updateOne: {
      filter: { handleId: doc.handleId },
      update: { $set: doc },
      upsert: true
    }
  }));

  const result = await OrderDetail.bulkWrite(bulkOps);
  
  return {
    nUpserted: result.upsertedCount,
    nModified: result.modifiedCount,
    nMatched: result.matchedCount,
  };
};

/**
 * 通过id删除记录
 * @param {ObjectId} orderDetailId
 * @returns {Promise<OrderDetail>}
 */
const deleteOrderDetailById = async (orderDetailId) => {
  const orderDetail = await getOrderDetailById(orderDetailId);
  if (!orderDetail) {
    throw new ApiError(httpStatus.NOT_FOUND, 'OrderDetail not found');
  }
  await orderDetail.remove();
  return orderDetail;
};

module.exports = {
  createOrderDetail,
  queryOrderDetails,
  getOrderDetailById,
  updateOrderDetailById,
  deleteOrderDetailById,
  bulkUpsertOrderDetails,
};
