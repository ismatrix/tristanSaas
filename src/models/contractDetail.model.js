const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');

const contractDetailSchema = mongoose.Schema(
  {
    uuid: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
  },
  {
    timestamps: true,
    strict: false, // 允许保存未在 schema 中定义的任何其他字段
  }
);

// 添加插件
contractDetailSchema.plugin(toJSON);
contractDetailSchema.plugin(paginate);

/**
 * @typedef ContractDetail
 */
const ContractDetail = mongoose.model('ContractDetail', contractDetailSchema);

module.exports = ContractDetail;
