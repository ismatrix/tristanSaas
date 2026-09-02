const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const contractDetailValidation = require('../../validations/contractDetail.validation');
const contractDetailController = require('../../controllers/contractDetail.controller');

const router = express.Router();

router
  .route('/bulk-upsert')
  .post(auth(), validate(contractDetailValidation.bulkUpsertContractDetails), contractDetailController.bulkUpsertContractDetails);

router
  .route('/')
  .post(auth(), validate(contractDetailValidation.createContractDetail), contractDetailController.createContractDetail)
  .get(auth(), validate(contractDetailValidation.getContractDetails), contractDetailController.getContractDetails);

router
  .route('/:contractDetailId')
  .get(auth(), validate(contractDetailValidation.getContractDetail), contractDetailController.getContractDetail)
  .patch(auth(), validate(contractDetailValidation.updateContractDetail), contractDetailController.updateContractDetail)
  .delete(auth(), validate(contractDetailValidation.deleteContractDetail), contractDetailController.deleteContractDetail);

module.exports = router;

/**
 * @swagger
 * tags:
 *   name: ContractDetails
 *   description: Contract Product Detail Management
 */

/**
 * @swagger
 * /contract-details/bulk-upsert:
 *   post:
 *     summary: Bulk upsert contract details
 *     description: Bulk import or update contract product detail line items.
 *     tags: [ContractDetails]
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
 * /contract-details:
 *   post:
 *     summary: Create contract detail
 *     description: Create a single contract detail item.
 *     tags: [ContractDetails]
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
 *     summary: Get contract details
 *     description: Retrieve contract detail records with pagination and filtering.
 *     tags: [ContractDetails]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: contractNumber
 *         schema:
 *           type: string
 *         description: Filter by contract number
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
 * /contract-details/{contractDetailId}:
 *   get:
 *     summary: Get a contract detail
 *     description: Fetch a single contract detail line by ID.
 *     tags: [ContractDetails]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contractDetailId
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
 *     summary: Update a contract detail
 *     description: Update details of an existing contract detail item.
 *     tags: [ContractDetails]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contractDetailId
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
 *     summary: Delete a contract detail
 *     description: Delete an existing contract detail item.
 *     tags: [ContractDetails]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contractDetailId
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
