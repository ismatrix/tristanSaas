const express = require('express');
const auth = require('../../middlewares/auth');
const dataGovernanceLogController = require('../../controllers/dataGovernanceLog.controller');

const router = express.Router();

router
  .route('/')
  .post(auth('editData'), dataGovernanceLogController.upsertGovernanceLog)
  .get(auth(), dataGovernanceLogController.getGovernanceLogs)
  .delete(auth('editData'), dataGovernanceLogController.deleteGovernanceLog);

module.exports = router;

/**
 * @swagger
 * tags:
 *   name: DataGovernanceLogs
 *   description: Data Governance Change Audit Log Management
 */

/**
 * @swagger
 * /data-governance-logs:
 *   post:
 *     summary: Record data governance log
 *     description: Create or update a data governance / field modification audit log.
 *     tags: [DataGovernanceLogs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       "200":
 *         description: Log recorded
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *
 *   get:
 *     summary: Get data governance logs
 *     description: Retrieve audit logs for data governance modifications.
 *     tags: [DataGovernanceLogs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: targetCollection
 *         schema:
 *           type: string
 *         description: Target collection name
 *       - in: query
 *         name: targetId
 *         schema:
 *           type: string
 *         description: Target document ID
 *     responses:
 *       "200":
 *         description: OK
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *
 *   delete:
 *     summary: Delete data governance log
 *     description: Delete a specific data governance audit log.
 *     tags: [DataGovernanceLogs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: id
 *         schema:
 *           type: string
 *         description: Log ID to delete
 *     responses:
 *       "200":
 *         description: Log deleted
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 */
