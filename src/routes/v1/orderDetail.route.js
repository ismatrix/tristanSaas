const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const orderDetailValidation = require('../../validations/orderDetail.validation');
const orderDetailController = require('../../controllers/orderDetail.controller');

const router = express.Router();

router
  .route('/bulk-upsert')
  .post(auth(), validate(orderDetailValidation.bulkUpsertOrderDetails), orderDetailController.bulkUpsertOrderDetails);

router
  .route('/')
  .post(auth(), validate(orderDetailValidation.createOrderDetail), orderDetailController.createOrderDetail)
  .get(auth(), validate(orderDetailValidation.getOrderDetails), orderDetailController.getOrderDetails);

router
  .route('/:orderDetailId')
  .get(auth(), validate(orderDetailValidation.getOrderDetail), orderDetailController.getOrderDetail)
  .patch(auth(), validate(orderDetailValidation.updateOrderDetail), orderDetailController.updateOrderDetail)
  .delete(auth(), validate(orderDetailValidation.deleteOrderDetail), orderDetailController.deleteOrderDetail);

module.exports = router;

/**
 * @swagger
 * tags:
 *   name: OrderDetails
 *   description: Order Product Detail Management
 */

/**
 * @swagger
 * /order-details/bulk-upsert:
 *   post:
 *     summary: Bulk upsert order details
 *     description: Bulk import or update order product detail line items.
 *     tags: [OrderDetails]
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
 * /order-details:
 *   post:
 *     summary: Create order detail
 *     description: Create a single order detail line item.
 *     tags: [OrderDetails]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       "201":
 *         description: Created
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *
 *   get:
 *     summary: Get order details
 *     description: Retrieve order detail records with pagination and filtering.
 *     tags: [OrderDetails]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: orderId
 *         schema:
 *           type: string
 *         description: Filter by parent order ID
 *       - in: query
 *         name: sortBy
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

/**
 * @swagger
 * /order-details/{orderDetailId}:
 *   get:
 *     summary: Get an order detail
 *     description: Fetch a single order detail line by ID.
 *     tags: [OrderDetails]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderDetailId
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
 *
 *   patch:
 *     summary: Update an order detail
 *     description: Update details of an existing order detail item.
 *     tags: [OrderDetails]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderDetailId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       "200":
 *         description: OK
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *
 *   delete:
 *     summary: Delete an order detail
 *     description: Delete an existing order detail item.
 *     tags: [OrderDetails]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderDetailId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       "200":
 *         description: No content
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */
