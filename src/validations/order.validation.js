const Joi = require('joi');
const { objectId } = require('./custom.validation');

const createOrder = {
  body: Joi.object().keys({
    requireCode: Joi.string().required(),
  }).unknown(true),
};

const getOrders = {
  query: Joi.object().keys({
    requireCode: Joi.string(),
    hasServNbr: Joi.alternatives().try(Joi.string(), Joi.boolean()),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }).unknown(true),
};

const getOrder = {
  params: Joi.object().keys({
    orderId: Joi.string().custom(objectId),
  }),
};

const updateOrder = {
  params: Joi.object().keys({
    orderId: Joi.required().custom(objectId),
  }),
  body: Joi.object()
    .keys({
      requireCode: Joi.string(),
    })
    .unknown(true)
    .min(1),
};

const deleteOrder = {
  params: Joi.object().keys({
    orderId: Joi.string().custom(objectId),
  }),
};

const bulkUpsertOrders = {
  body: Joi.array().items(
    Joi.object().keys({
      requireCode: Joi.string().required(),
    }).unknown(true)
  ).min(1).required(),
};

module.exports = {
  createOrder,
  getOrders,
  getOrder,
  updateOrder,
  deleteOrder,
  bulkUpsertOrders,
};
