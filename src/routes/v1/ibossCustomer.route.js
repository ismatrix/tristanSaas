const express = require('express');
const auth = require('../../middlewares/auth');
const ibossCustomerController = require('../../controllers/ibossCustomer.controller');

const router = express.Router();

router
  .route('/bulk-upsert')
  .post(auth(), ibossCustomerController.syncCustomers);

router
  .route('/')
  .get(auth(), ibossCustomerController.getCustomers);

module.exports = router;

/**
 * @swagger
 * tags:
 *   name: iBOSSCustomers
 *   description: iBOSS Customer Synchronization & Management
 */

/**
 * @swagger
 * /iboss-customers/bulk-upsert:
 *   post:
 *     summary: Bulk upsert iBOSS customers
 *     description: Bulk synchronize or update iBOSS customers data.
 *     tags: [iBOSSCustomers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *     responses:
 *       "200":
 *         description: Upserted successfully
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /iboss-customers:
 *   get:
 *     summary: Get iBOSS customers
 *     description: Retrieve list of iBOSS customers with search and pagination.
 *     tags: [iBOSSCustomers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search keyword
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
