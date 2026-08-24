const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const pageViewService = require('../services/pageView.service');

const getClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.connection?.remoteAddress || '';
};

/**
 * 接收前端页面访问埋点上报
 */
const recordPageView = catchAsync(async (req, res) => {
  const ip = getClientIp(req);
  const userAgent = req.headers['user-agent'] || '';
  const referrer = req.headers['referer'] || req.body.referrer || '';

  const payload = {
    ...req.body,
    ip,
    userAgent,
    referrer,
  };

  // 异步写入，提升前端响应速度
  pageViewService.recordPageView(payload).catch((err) => {
    // 静默记录错误，不影响上报
    console.error('Failed to record page view:', err);
  });

  res.status(httpStatus.OK).send({ success: true });
});

/**
 * 获取访问明细日志流水
 */
const getPageViewLogs = catchAsync(async (req, res) => {
  const { path, nameCn, userEmail, ip, startDate, endDate, page, limit, sortBy } = req.query;
  const filter = { path, nameCn, userEmail, ip, startDate, endDate };
  const options = { page, limit, sortBy };
  const result = await pageViewService.getPageViewLogs(filter, options);
  res.send(result);
});

/**
 * 获取页面访问热度排行
 */
const getPageViewStats = catchAsync(async (req, res) => {
  const result = await pageViewService.getPageViewStats(req.query);
  res.send(result);
});

/**
 * 获取访问总体概览指标
 */
const getOverview = catchAsync(async (req, res) => {
  const result = await pageViewService.getOverview();
  res.send(result);
});

module.exports = {
  recordPageView,
  getPageViewLogs,
  getPageViewStats,
  getOverview,
};
