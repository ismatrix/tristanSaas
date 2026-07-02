const express = require('express');
const auth = require('../../middlewares/auth');
const overviewController = require('../../controllers/keyCustomerOverview.controller');

const router = express.Router();

// 获取要客总览所有统计数据的 API 接口
router.get('/stats', auth(), overviewController.getOverviewStats);

// 获取指定国家下的所有分支明细（带要客集团中文名关联）
router.get('/country-branches', auth(), overviewController.getCountryBranches);

// 获取指定客户在指定年份下的 TCV 签单明细列表
router.get('/tcv-detail', auth(), overviewController.getTcvDetail);

// 获取指定客户在指定年份下的 BR 计费明细列表
router.get('/br-detail', auth(), overviewController.getBrDetail);

module.exports = router;
