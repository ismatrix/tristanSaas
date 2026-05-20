const Joi = require('joi');
const { objectId } = require('./custom.validation');

const createOrderDetail = {
  body: Joi.object().keys({
    handleId: Joi.string().required(),
  }).unknown(true),
};

const getOrderDetails = {
  query: Joi.object().keys({
    handleId: Joi.string(),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }).unknown(true),
};

const getOrderDetail = {
  params: Joi.object().keys({
    orderDetailId: Joi.string().custom(objectId),
  }),
};

const updateOrderDetail = {
  params: Joi.object().keys({
    orderDetailId: Joi.required().custom(objectId),
  }),
  body: Joi.object()
    .keys({
      handleId: Joi.string(),
    })
    .unknown(true)
    .min(1),
};

const deleteOrderDetail = {
  params: Joi.object().keys({
    orderDetailId: Joi.string().custom(objectId),
  }),
};

const bulkUpsertOrderDetails = {
  body: Joi.array().items(
    Joi.object().keys({
      handleId: Joi.string().required(),
    }).unknown(true)
  ).min(1).required(),
};

module.exports = {
  createOrderDetail,
  getOrderDetails,
  getOrderDetail,
  updateOrderDetail,
  deleteOrderDetail,
  bulkUpsertOrderDetails,
};
