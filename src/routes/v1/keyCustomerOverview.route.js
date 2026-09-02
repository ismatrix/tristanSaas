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

/**
 * @swagger
 * tags:
 *   name: KeyCustomerOverview
 *   description: Key Customer Overview, Tree Penetration & Dashboard Analytics
 */

/**
 * @swagger
 * /key-customer-overview/stats:
 *   get:
 *     summary: Get overview dashboard stats
 *     description: Retrieve global overview statistics including TCV, BR, and trend charts.
 *     tags: [KeyCustomerOverview]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       "200":
 *         description: OK
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /key-customer-overview/country-branches:
 *   get:
 *     summary: Get country branches breakdown
 *     description: Retrieve all branches located in a specific country with group Chinese name mapping.
 *     tags: [KeyCustomerOverview]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: country
 *         required: true
 *         schema:
 *           type: string
 *         description: Country name
 *     responses:
 *       "200":
 *         description: OK
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /key-customer-overview/tcv-detail:
 *   get:
 *     summary: Get TCV contract signing details
 *     description: Retrieve TCV line details by customer and year.
 *     tags: [KeyCustomerOverview]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: customerName
 *         schema:
 *           type: string
 *       - in: query
 *         name: year
 *         schema:
 *           type: string
 *     responses:
 *       "200":
 *         description: OK
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /key-customer-overview/br-detail:
 *   get:
 *     summary: Get BR billing details
 *     description: Retrieve BR billing details by customer and year.
 *     tags: [KeyCustomerOverview]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: customerName
 *         schema:
 *           type: string
 *       - in: query
 *         name: year
 *         schema:
 *           type: string
 *     responses:
 *       "200":
 *         description: OK
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /key-customer-overview/family-tree-dashboard-stats:
 *   get:
 *     summary: Get overseas family tree dashboard stats
 *     description: Retrieve overseas family tree hierarchy and stats for a specific customer.
 *     tags: [KeyCustomerOverview]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: keycustomerId
 *         schema:
 *           type: string
 *     responses:
 *       "200":
 *         description: OK
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /key-customer-overview/penetrated-gids:
 *   get:
 *     summary: Get penetrated GIDs
 *     description: Retrieve list of GIDs where CMI business penetration has occurred.
 *     tags: [KeyCustomerOverview]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       "200":
 *         description: OK
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /key-customer-overview/family-tree-distinct-options:
 *   get:
 *     summary: Get distinct options for family tree filters
 *     description: Retrieve unique countries, regions, and cities from keyGlobalFamilyTree for select dropdowns.
 *     tags: [KeyCustomerOverview]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       "200":
 *         description: OK
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /key-customer-overview/branches:
 *   get:
 *     summary: Get family tree branch penetration list
 *     description: Retrieve all family tree branches with TCV penetration stats, search, and pagination.
 *     tags: [KeyCustomerOverview]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: country
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *         default: 10
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         default: 1
 *     responses:
 *       "200":
 *         description: OK
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 */
