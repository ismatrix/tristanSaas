const express = require('express');
const pageViewController = require('../../controllers/pageView.controller');

const router = express.Router();

// 埋点上报端点（前端静默上报，允许免鉴权上报）
router.post('/record', pageViewController.recordPageView);

// 统计与流水查询接口
router.get('/overview', pageViewController.getOverview);
router.get('/stats', pageViewController.getPageViewStats);
router.get('/logs', pageViewController.getPageViewLogs);

module.exports = router;
