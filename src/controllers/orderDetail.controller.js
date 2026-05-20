const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { orderDetailService } = require('../services');

const createOrderDetail = catchAsync(async (req, res) => {
  const orderDetail = await orderDetailService.createOrderDetail(req.body);
  res.status(httpStatus.CREATED).send(orderDetail);
});

const getOrderDetails = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['handleId']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await orderDetailService.queryOrderDetails(filter, options);
  res.send(result);
});

const getOrderDetail = catchAsync(async (req, res) => {
  const orderDetail = await orderDetailService.getOrderDetailById(req.params.orderDetailId);
  if (!orderDetail) {
    throw new ApiError(httpStatus.NOT_FOUND, 'OrderDetail not found');
  }
  res.send(orderDetail);
});

const updateOrderDetail = catchAsync(async (req, res) => {
  const orderDetail = await orderDetailService.updateOrderDetailById(req.params.orderDetailId, req.body);
  res.send(orderDetail);
});

const deleteOrderDetail = catchAsync(async (req, res) => {
  await orderDetailService.deleteOrderDetailById(req.params.orderDetailId);
  res.status(httpStatus.NO_CONTENT).send();
});

const bulkUpsertOrderDetails = catchAsync(async (req, res) => {
  const result = await orderDetailService.bulkUpsertOrderDetails(req.body);
  res.status(httpStatus.OK).send({
    message: '批量处理成功',
    ...result
  });
});

module.exports = {
  createOrderDetail,
  getOrderDetails,
  getOrderDetail,
  updateOrderDetail,
  deleteOrderDetail,
  bulkUpsertOrderDetails,
};
