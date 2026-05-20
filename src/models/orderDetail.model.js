const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');

const orderDetailSchema = mongoose.Schema(
  {
    handleId: {
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

// add plugin that converts mongoose to json
orderDetailSchema.plugin(toJSON);
orderDetailSchema.plugin(paginate);

/**
 * @typedef OrderDetail
 */
const OrderDetail = mongoose.model('OrderDetail', orderDetailSchema);

module.exports = OrderDetail;
