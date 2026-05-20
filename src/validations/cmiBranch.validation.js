const Joi = require('joi');
const { objectId } = require('./custom.validation');

const getBranches = {
  query: Joi.object().keys({
    columnDesc: Joi.string(),
    RegionCode: Joi.string(),
    UnitCode: Joi.string(),
    status: Joi.string(),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const updateBranch = {
  params: Joi.object().keys({
    branchId: Joi.string().custom(objectId),
  }),
  body: Joi.object()
    .keys({
      columnDesc: Joi.string(),
      columnDesc_zh: Joi.string(),
      columnValue: Joi.string(),
      RegionCode: Joi.string(),
      UnitCode: Joi.string(),
      status: Joi.string(),
    })
    .min(1),
};

module.exports = {
  getBranches,
  updateBranch,
};
