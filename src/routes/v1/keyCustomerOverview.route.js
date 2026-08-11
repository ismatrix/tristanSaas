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

// 获取指定客户海外家族树的 Dashboard 统计与明细数据
router.get('/family-tree-dashboard-stats', auth(), overviewController.getFamilyTreeDashboardData);

// 获取所有已发生过 CMI 成交渗透的要客集团 GID 列表
router.get('/penetrated-gids', auth(), overviewController.getPenetratedGids);

// 获取 keyGlobalFamilyTree 全表 distinct 去重下拉数据 (国家、区域、城市等)
router.get('/family-tree-distinct-options', auth(), overviewController.getFamilyTreeDistinctOptions);

// 获取 keyGlobalFamilyTree 全量分支的渗透情况列表（含历史 TCV 笔数、搜索与分页）
router.get('/branches', auth(), overviewController.getKeyFamilyTreeBranches);

module.exports = router;
