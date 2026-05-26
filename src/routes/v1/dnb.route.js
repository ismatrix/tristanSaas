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
