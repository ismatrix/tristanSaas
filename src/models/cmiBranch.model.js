const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');

const cmiBranchSchema = mongoose.Schema(
  {
    columnValue: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    columnDesc: {
      type: String,
      trim: true,
    },
    columnDesc_zh: {
      type: String,
      trim: true,
    },
    RegionCode: {
      type: String,
      trim: true,
    },
    UnitCode: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    strict: false, // 允许保存未在 schema 中定义的任何其他字段
  }
);

// add plugin that converts mongoose to json
cmiBranchSchema.plugin(toJSON);
cmiBranchSchema.plugin(paginate);

/**
 * @typedef CmiBranch
 */
const CmiBranch = mongoose.model('CmiBranch', cmiBranchSchema);

module.exports = CmiBranch;
