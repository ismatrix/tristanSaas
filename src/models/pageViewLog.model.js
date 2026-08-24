const mongoose = require('mongoose');

const pageViewLogSchema = mongoose.Schema(
  {
    path: {
      type: String,
      required: true,
      index: true,
    },
    fullUrl: {
      type: String,
      default: '',
    },
    nameCn: {
      type: String,
      default: '',
    },
    abbr: {
      type: String,
      default: '',
    },
    title: {
      type: String,
      default: '',
    },
    userEmail: {
      type: String,
      default: '',
      index: true,
    },
    userName: {
      type: String,
      default: '',
    },
    ip: {
      type: String,
      default: '',
    },
    userAgent: {
      type: String,
      default: '',
    },
    referrer: {
      type: String,
      default: '',
    },
    visitedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// 索引优化：支持按访问时间降序以及路径联合查询
pageViewLogSchema.index({ createdAt: -1 });
pageViewLogSchema.index({ path: 1, createdAt: -1 });

const PageViewLog = mongoose.model('pageViewLog', pageViewLogSchema, 'pageViewLog');

module.exports = PageViewLog;
