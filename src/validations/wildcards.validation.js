const Joi = require('joi');
const { objectId } = require('./custom.validation');

const getCollections = {
  query: Joi.object().keys({
    prefix: Joi.string().allow(''),
  }),
};

const createRecord = {
  params: Joi.object().keys({
    collection: Joi.string().required(),
  }),
  body: Joi.object().unknown(),
};

const getRecords = {
  params: Joi.object().keys({
    collection: Joi.string().required(),
  }),
  query: Joi.object().unknown(),
};

const getRecord = {
  params: Joi.object().keys({
    collection: Joi.string().required(),
    id: Joi.string().custom(objectId),
  }),
};

const updateRecord = {
  params: Joi.object().keys({
    collection: Joi.string().required(),
    id: Joi.string().required().custom(objectId),
  }),
  body: Joi.object().unknown(),
};

const deleteRecord = {
  params: Joi.object().keys({
    collection: Joi.string().required(),
    id: Joi.string().custom(objectId),
  }),
};

const bulkUpsert = {
  params: Joi.object().keys({
    collection: Joi.string().required(),
  }),
  body: Joi.object().keys({
    records: Joi.array().items(Joi.object()).required(),
    primaryKey: Joi.string().allow('', null),
  }).unknown(true),
};

module.exports = {
  getCollections,
  createRecord,
  bulkUpsert,
  getRecords,
  getRecord,
  updateRecord,
  deleteRecord,
};
