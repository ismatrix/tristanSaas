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

module.exports = router;
