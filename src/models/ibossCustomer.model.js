const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');

const ibossCustomerSchema = mongoose.Schema(
  {
    custId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    enterpriseName: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    strict: false, // 允许保存 iBOSS 接口返回的所有动态字段
  }
);

// add plugin that converts mongoose to json
ibossCustomerSchema.plugin(toJSON);
ibossCustomerSchema.plugin(paginate);

/**
 * @typedef IBossCustomer
 */
const IBossCustomer = mongoose.model('IBossCustomer', ibossCustomerSchema);

module.exports = IBossCustomer;
