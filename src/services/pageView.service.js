const PageViewLog = require('../models/pageViewLog.model');
const PageViewStats = require('../models/pageViewStats.model');

/**
 * 记录一次页面访问（同时写入流水表并原子更新统计表）
 * @param {Object} data 
 * @returns {Promise<Object>}
 */
const recordPageView = async (data) => {
  const {
    path = '',
    fullUrl = '',
    nameCn = '',
    abbr = '',
    title = '',
    userEmail = '',
    userName = '',
    ip = '',
    userAgent = '',
    referrer = '',
  } = data;

  if (!path) return null;

  const now = new Date();

  // 1. 写入访问明细日志表
  const logPromise = PageViewLog.create({
    path,
    fullUrl,
    nameCn,
    abbr,
    title,
    userEmail,
    userName,
    ip,
    userAgent,
    referrer,
    visitedAt: now,
  });

  // 2. 统计 UV (判断该用户或该 IP 是否访问过该 path)
  const userIdentifier = userEmail || ip;
  let isNewUserForPath = false;
  if (userIdentifier) {
    const existingLog = await PageViewLog.findOne({
      path,
      ...(userEmail ? { userEmail } : { ip }),
    }).select('_id');
    if (!existingLog) {
      isNewUserForPath = true;
    }
  }

  // 3. 原子更新聚合统计表
  const statsUpdate = {
    $inc: { pv: 1, ...(isNewUserForPath ? { uv: 1 } : {}) },
    $set: {
      lastVisitedAt: now,
      lastUserEmail: userEmail || undefined,
      lastUserName: userName || undefined,
      ...(nameCn ? { nameCn } : {}),
      ...(abbr ? { abbr } : {}),
      ...(title ? { title } : {}),
    },
    $setOnInsert: {
      path,
      ...(!isNewUserForPath ? { uv: 1 } : {}),
    },
  };

  const statsPromise = PageViewStats.findOneAndUpdate(
    { path },
    statsUpdate,
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const [log, stats] = await Promise.all([logPromise, statsPromise]);
  return { log, stats };
};

/**
 * 分页或条件查询访问明细流水
 * @param {Object} filter 
 * @param {Object} options 
 * @returns {Promise<Object>}
 */
const getPageViewLogs = async (filter = {}, options = {}) => {
  const page = parseInt(options.page, 10) || 1;
  const limit = parseInt(options.limit, 10) || 100;
  const skip = (page - 1) * limit;
  const sortBy = options.sortBy || 'visitedAt:desc';

  const [sortField, sortOrder] = sortBy.split(':');
  const sort = { [sortField]: sortOrder === 'desc' ? -1 : 1 };

  const query = {};
  if (filter.path) query.path = { $regex: filter.path, $options: 'i' };
  if (filter.nameCn) query.nameCn = { $regex: filter.nameCn, $options: 'i' };
  if (filter.userEmail) query.userEmail = { $regex: filter.userEmail, $options: 'i' };
  if (filter.ip) query.ip = { $regex: filter.ip, $options: 'i' };
  if (filter.startDate || filter.endDate) {
    query.visitedAt = {};
    if (filter.startDate) query.visitedAt.$gte = new Date(filter.startDate);
    if (filter.endDate) query.visitedAt.$lte = new Date(filter.endDate);
  }

  const [results, totalResults] = await Promise.all([
    PageViewLog.find(query).sort(sort).skip(skip).limit(limit).lean(),
    PageViewLog.countDocuments(query),
  ]);

  const totalPages = Math.ceil(totalResults / limit);

  return {
    results,
    page,
    limit,
    totalPages,
    totalResults,
  };
};

/**
 * 查询页面访问热度聚合排行
 * @param {Object} query 
 * @returns {Promise<Array>}
 */
const getPageViewStats = async (query = {}) => {
  const limit = parseInt(query.limit, 10) || 100;
  const sortBy = query.sortBy || 'pv';
  const sort = { [sortBy]: -1 };

  const filter = {};
  if (query.keyword) {
    filter.$or = [
      { path: { $regex: query.keyword, $options: 'i' } },
      { nameCn: { $regex: query.keyword, $options: 'i' } },
      { title: { $regex: query.keyword, $options: 'i' } },
    ];
  }

  const stats = await PageViewStats.find(filter).sort(sort).limit(limit).lean();
  return stats;
};

/**
 * 获取全局访问概览指标
 * @returns {Promise<Object>}
 */
const getOverview = async () => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [
    totalLogs,
    uniquePages,
    todayLogs,
    totalPvStats,
  ] = await Promise.all([
    PageViewLog.countDocuments(),
    PageViewStats.countDocuments(),
    PageViewLog.countDocuments({ visitedAt: { $gte: todayStart } }),
    PageViewStats.aggregate([
      { $group: { _id: null, totalPv: { $sum: '$pv' }, totalUv: { $sum: '$uv' } } },
    ]),
  ]);

  const distinctUsers = await PageViewLog.distinct('userEmail', { userEmail: { $ne: '' } });
  const todayDistinctUsers = await PageViewLog.distinct('userEmail', {
    visitedAt: { $gte: todayStart },
    userEmail: { $ne: '' },
  });

  return {
    totalPv: totalPvStats[0]?.totalPv || totalLogs,
    totalUv: distinctUsers.length || totalPvStats[0]?.totalUv || 0,
    todayPv: todayLogs,
    todayUv: todayDistinctUsers.length,
    totalPages: uniquePages,
  };
};

module.exports = {
  recordPageView,
  getPageViewLogs,
  getPageViewStats,
  getOverview,
};
