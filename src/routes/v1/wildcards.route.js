const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const wildcardsValidation = require('../../validations/wildcards.validation');
const wildcardsController = require('../../controllers/wildcards.controller');

const router = express.Router();

router
  .route('/')
  .get(auth(), validate(wildcardsValidation.getCollections), wildcardsController.getCollections);

router
  .route('/:collection/bulk-upsert')
  .post(auth(), validate(wildcardsValidation.bulkUpsert), wildcardsController.bulkUpsert);

router
  .route('/:collection')
  .post(auth(), validate(wildcardsValidation.createRecord), wildcardsController.createRecord)
  .get(auth(), validate(wildcardsValidation.getRecords), wildcardsController.getRecords)
  .delete(auth(), validate(wildcardsValidation.deleteRecords), wildcardsController.deleteRecords);

router
  .route('/:collection/:id')
  .get(auth(), validate(wildcardsValidation.getRecord), wildcardsController.getRecord)
  .patch(auth(), validate(wildcardsValidation.updateRecord), wildcardsController.updateRecord)
  .delete(auth(), validate(wildcardsValidation.deleteRecord), wildcardsController.deleteRecord);

module.exports = router;

/**
 * @swagger
 * tags:
 *   name: Wildcards
 *   description: Generic CRUD operations for any collection
 */

/**
 * @swagger
 * /wildcards/{collection}:
 *   post:
 *     summary: Create a record
 *     description: Create a new record in a specific collection.
 *     tags: [Wildcards]
 *     parameters:
 *       - in: path
 *         name: collection
 *         required: true
 *         schema:
 *           type: string
 *         description: Collection name
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Any JSON object
 *     responses:
 *       "201":
 *         description: Created
 *
 *   get:
 *     summary: Get all records
 *     description: Retrieve all records from a specific collection with JSON filters.
 *     tags: [Wildcards]
 *     parameters:
 *       - in: path
 *         name: collection
 *         required: true
 *         schema:
 *           type: string
 *         description: Collection name
 *       - in: query
 *         name: query
 *         schema:
 *           type: string
 *         description: JSON string of MongoDB query filter (e.g., {"name":"Alice"})
 *       - in: query
 *         name: projection
 *         schema:
 *           type: string
 *         description: JSON string of MongoDB projection (e.g., {"_id":0,"name":1})
 *       - in: query
 *         name: options
 *         schema:
 *           type: string
 *         description: JSON string of options (e.g., {"limit":10,"page":1,"sort":{"createdAt":-1}})
 *     responses:
 *       "200":
 *         description: OK
 */

/**
 * @swagger
 * /wildcards/{collection}/{id}:
 *   get:
 *     summary: Get a record
 *     description: Fetch a single record by its ID.
 *     tags: [Wildcards]
 *     parameters:
 *       - in: path
 *         name: collection
 *         required: true
 *         schema:
 *           type: string
 *         description: Collection name
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Record ID
 *     responses:
 *       "200":
 *         description: OK
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *
 *   patch:
 *     summary: Update a record
 *     description: Update a single record by its ID.
 *     tags: [Wildcards]
 *     parameters:
 *       - in: path
 *         name: collection
 *         required: true
 *         schema:
 *           type: string
 *         description: Collection name
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Record ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Any JSON object representing fields to update
 *     responses:
 *       "200":
 *         description: OK
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *
 *   delete:
 *     summary: Delete a record
 *     description: Delete a single record by its ID.
 *     tags: [Wildcards]
 *     parameters:
 *       - in: path
 *         name: collection
 *         required: true
 *         schema:
 *           type: string
 *         description: Collection name
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Record ID
 *     responses:
 *       "204":
 *         description: No content
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */
