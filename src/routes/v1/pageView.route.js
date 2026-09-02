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

/**
 * @swagger
 * tags:
 *   name: PageViews
 *   description: Frontend Tracking & Page View Analytics
 */

/**
 * @swagger
 * /page-views/record:
 *   post:
 *     summary: Record page view event
 *     description: Report a page view or user tracking event from the frontend.
 *     tags: [PageViews]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               path:
 *                 type: string
 *               title:
 *                 type: string
 *               referrer:
 *                 type: string
 *     responses:
 *       "200":
 *         description: Event recorded
 */

/**
 * @swagger
 * /page-views/overview:
 *   get:
 *     summary: Get overall PV/UV analytics overview
 *     description: Retrieve system-wide total PV, UV, today metrics, and baseline overview.
 *     tags: [PageViews]
 *     responses:
 *       "200":
 *         description: OK
 */

/**
 * @swagger
 * /page-views/stats:
 *   get:
 *     summary: Get page view trend stats
 *     description: Retrieve time-series chart stats and most visited route rankings.
 *     tags: [PageViews]
 *     responses:
 *       "200":
 *         description: OK
 */

/**
 * @swagger
 * /page-views/logs:
 *   get:
 *     summary: Get page view logs
 *     description: Retrieve detailed access audit trail logs with search and pagination.
 *     tags: [PageViews]
 *     parameters:
 *       - in: query
 *         name: path
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *         default: 20
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         default: 1
 *     responses:
 *       "200":
 *         description: OK
 */
