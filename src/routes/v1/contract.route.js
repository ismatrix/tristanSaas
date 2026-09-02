const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const contractValidation = require('../../validations/contract.validation');
const contractController = require('../../controllers/contract.controller');

const router = express.Router();

router
  .route('/bulk-upsert')
  .post(auth(), validate(contractValidation.bulkUpsertContracts), contractController.bulkUpsertContracts);

router
  .route('/')
  .post(auth(), validate(contractValidation.createContract), contractController.createContract)
  .get(auth(), validate(contractValidation.getContracts), contractController.getContracts);

router
  .route('/:contractId')
  .get(auth(), validate(contractValidation.getContract), contractController.getContract)
  .patch(auth(), validate(contractValidation.updateContract), contractController.updateContract)
  .delete(auth(), validate(contractValidation.deleteContract), contractController.deleteContract);

module.exports = router;

/**
 * @swagger
 * tags:
 *   name: Contracts
 *   description: Commercial Contract Management
 */

/**
 * @swagger
 * /contracts/bulk-upsert:
 *   post:
 *     summary: Bulk upsert contracts
 *     description: Bulk import or update contract records.
 *     tags: [Contracts]
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
 * /contracts:
 *   post:
 *     summary: Create a contract
 *     description: Create a single contract record.
 *     tags: [Contracts]
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
 *     summary: Get contracts
 *     description: Retrieve contract records with pagination and filtering.
 *     tags: [Contracts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Keyword search
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *         description: Sort parameter
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
 * /contracts/{contractId}:
 *   get:
 *     summary: Get a contract
 *     description: Fetch a single contract by ID.
 *     tags: [Contracts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contractId
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
 *     summary: Update a contract
 *     description: Update details of an existing contract.
 *     tags: [Contracts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contractId
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
 *     summary: Delete a contract
 *     description: Delete an existing contract by ID.
 *     tags: [Contracts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contractId
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
