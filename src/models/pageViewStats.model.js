const mongoose = require('mongoose');

const pageViewStatsSchema = mongoose.Schema(
  {
    path: {
      type: String,
      required: true,
      unique: true,
      index: true,
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
    pv: {
      type: Number,
      default: 0,
      index: -1, // 便于热度降序查询
    },
    uv: {
      type: Number,
      default: 0,
    },
    lastVisitedAt: {
      type: Date,
      default: Date.now,
      index: -1,
    },
    lastUserEmail: {
      type: String,
      default: '',
    },
    lastUserName: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

const PageViewStats = mongoose.model('pageViewStats', pageViewStatsSchema, 'pageViewStats');

module.exports = PageViewStats;
