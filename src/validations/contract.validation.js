const Joi = require('joi');
const { objectId } = require('./custom.validation');

const createContract = {
  body: Joi.object().keys({
    uuid: Joi.string().required(),
  }).unknown(true),
};

const getContracts = {
  query: Joi.object().keys({
    uuid: Joi.string(),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }).unknown(true),
};

const getContract = {
  params: Joi.object().keys({
    contractId: Joi.string().custom(objectId),
  }),
};

const updateContract = {
  params: Joi.object().keys({
    contractId: Joi.required().custom(objectId),
  }),
  body: Joi.object()
    .keys({
      uuid: Joi.string(),
    })
    .unknown(true)
    .min(1),
};

const deleteContract = {
  params: Joi.object().keys({
    contractId: Joi.string().custom(objectId),
  }),
};

const bulkUpsertContracts = {
  body: Joi.array().items(
    Joi.object().keys({
      uuid: Joi.string().required(),
    }).unknown(true)
  ).min(1).required(),
};

module.exports = {
  createContract,
  getContracts,
  getContract,
  updateContract,
  deleteContract,
  bulkUpsertContracts,
};
