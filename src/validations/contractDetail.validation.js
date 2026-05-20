const Joi = require('joi');
const { objectId } = require('./custom.validation');

const createContractDetail = {
  body: Joi.object().keys({
    uuid: Joi.string().required(),
  }).unknown(true),
};

const getContractDetails = {
  query: Joi.object().keys({
    uuid: Joi.string(),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }).unknown(true),
};

const getContractDetail = {
  params: Joi.object().keys({
    contractDetailId: Joi.string().custom(objectId),
  }),
};

const updateContractDetail = {
  params: Joi.object().keys({
    contractDetailId: Joi.required().custom(objectId),
  }),
  body: Joi.object()
    .keys({
      uuid: Joi.string(),
    })
    .unknown(true)
    .min(1),
};

const deleteContractDetail = {
  params: Joi.object().keys({
    contractDetailId: Joi.string().custom(objectId),
  }),
};

const bulkUpsertContractDetails = {
  body: Joi.array().items(
    Joi.object().keys({
      uuid: Joi.string().required(),
    }).unknown(true)
  ).min(1).required(),
};

module.exports = {
  createContractDetail,
  getContractDetails,
  getContractDetail,
  updateContractDetail,
  deleteContractDetail,
  bulkUpsertContractDetails,
};
