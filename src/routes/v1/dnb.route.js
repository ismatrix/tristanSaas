const express = require('express');
const auth = require('../../middlewares/auth');
const dnbController = require('../../controllers/dnb.controller');

const router = express.Router();

/**
 * POST /api/v1/dnb/family-tree
 * 同步 DNB 家族树数据到 MongoDB（单次请求，无进度反馈）
 * 请求体：{ globalUltimateDuns: string, collectionName: string, keycustomerId?: string }
 */
router.post('/family-tree', auth(), dnbController.syncFamilyTree);

/**
 * GET /api/v1/dnb/family-tree/sync-stream
 * 分页同步家族树，以 SSE 流式实时推送各页进度
 * 查询参数：globalUltimateDuns, collectionName, keycustomerId?
 */
router.get('/family-tree/sync-stream', auth(), dnbController.syncFamilyTreeStream);

/**
 * POST /api/v1/dnb/company-detail/sync
 * 批量同步 DNB 详情数据
 * 请求体：{ dunsList: Array<string> }
 */
router.post('/company-detail/sync', auth(), dnbController.syncCompanyDetail);

/**
 * POST /api/v1/dnb/company-detail/check-exist
 * 批量检查 DUNS 公司详情在数据库中是否存在
 * 请求体：{ dunsList: Array<string> }
 */
router.post('/company-detail/check-exist', auth(), dnbController.checkCompanyDetailExist);

/**
 * GET /api/v1/dnb/company-detail/:duns
 * 获取单个 DUNS 详情
 */
router.get('/company-detail/:duns', auth(), dnbController.getCompanyDetail);

module.exports = router;

/**
 * @swagger
 * tags:
 *   name: DNB
 *   description: Dun & Bradstreet Data Integration
 */

/**
 * @swagger
 * /dnb/family-tree:
 *   post:
 *     summary: Sync DNB family tree
 *     description: Synchronize DNB family tree data directly into MongoDB.
 *     tags: [DNB]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - globalUltimateDuns
 *               - collectionName
 *             properties:
 *               globalUltimateDuns:
 *                 type: string
 *               collectionName:
 *                 type: string
 *               keycustomerId:
 *                 type: string
 *     responses:
 *       "200":
 *         description: OK
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /dnb/family-tree/sync-stream:
 *   get:
 *     summary: Sync DNB family tree stream
 *     description: Synchronize DNB family tree with Server-Sent Events (SSE) streaming real-time progress.
 *     tags: [DNB]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: globalUltimateDuns
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: collectionName
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: keycustomerId
 *         schema:
 *           type: string
 *     responses:
 *       "200":
 *         description: SSE stream initiated
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /dnb/company-detail/sync:
 *   post:
 *     summary: Batch sync company details
 *     description: Batch sync DNB enterprise profile details into the database.
 *     tags: [DNB]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - dunsList
 *             properties:
 *               dunsList:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       "200":
 *         description: OK
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /dnb/company-detail/check-exist:
 *   post:
 *     summary: Batch check company detail existence
 *     description: Check which DUNS numbers already exist in MongoDB company details.
 *     tags: [DNB]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - dunsList
 *             properties:
 *               dunsList:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       "200":
 *         description: OK
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /dnb/company-detail/{duns}:
 *   get:
 *     summary: Get single company detail
 *     description: Fetch detailed DNB company profile by DUNS number.
 *     tags: [DNB]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: duns
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       "200":
 *         description: OK
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */
