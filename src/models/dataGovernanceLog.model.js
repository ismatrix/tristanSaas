const mongoose = require('mongoose');

const dataGovernanceLogSchema = mongoose.Schema(
  {
    rootGID: {
      type: String,
      required: true,
      index: true,
    },
    companyId: {
      type: String,
      default: '',
      index: true,
    },
    custId: {
      type: String,
      default: '',
      index: true,
    },
    status: {
      type: String,
      default: 'no',
    },
    notes: {
      type: String,
      default: '',
    },
    staff: {
      type: String,
      default: '',
    },
    updateAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// 组合唯一/高频索引：以 rootGID 为主，联合 companyId / custId
dataGovernanceLogSchema.index({ rootGID: 1, companyId: 1 });
dataGovernanceLogSchema.index({ rootGID: 1, custId: 1 });

const DataGovernanceLog = mongoose.model('DataGovernanceLog', dataGovernanceLogSchema);

module.exports = DataGovernanceLog;
