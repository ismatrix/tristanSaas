const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');

const contractSchema = mongoose.Schema(
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
contractSchema.plugin(toJSON);
contractSchema.plugin(paginate);

/**
 * @typedef Contract
 */
const Contract = mongoose.model('Contract', contractSchema);

module.exports = Contract;
