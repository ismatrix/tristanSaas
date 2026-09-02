const express = require('express');
const ibossController = require('../../controllers/iboss.controller');

const router = express.Router();

router.post('/getOrdersByParam', ibossController.getOrdersByParam);

module.exports = router;

/**
 * @swagger
 * tags:
 *   name: iBOSS
 *   description: iBOSS Integration & Capability Going-Global Orders
 */

/**
 * @swagger
 * /iboss/getOrdersByParam:
 *   post:
 *     summary: Proxy query orders from upstream iBOSS
 *     description: Proxies order querying requests directly to upstream iBOSS product capability API.
 *     tags: [iBOSS]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       "200":
 *         description: OK
 */
