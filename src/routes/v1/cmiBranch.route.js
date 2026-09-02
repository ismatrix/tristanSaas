const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const { cmiBranchValidation } = require('../../validations');
const cmiBranchController = require('../../controllers/cmiBranch.controller');

const router = express.Router();

router
  .route('/')
  .get(auth(), validate(cmiBranchValidation.getBranches), cmiBranchController.getBranches);

router
  .route('/:branchId')
  .patch(auth(), validate(cmiBranchValidation.updateBranch), cmiBranchController.updateBranch);

module.exports = router;

/**
 * @swagger
 * tags:
 *   name: CMIBranches
 *   description: CMI Overseas Branch Management
 */

/**
 * @swagger
 * /cmi-branches:
 *   get:
 *     summary: Get all CMI branches
 *     description: Retrieve list of CMI overseas branches with optional filtering by region and country.
 *     tags: [CMIBranches]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: region
 *         schema:
 *           type: string
 *         description: Branch region
 *       - in: query
 *         name: country
 *         schema:
 *           type: string
 *         description: Branch country / region name
 *       - in: query
 *         name: countryCode
 *         schema:
 *           type: string
 *         description: Two-letter ISO country code
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *         description: sort by query in the form of field:desc/asc
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *         default: 50
 *         description: Maximum number of results
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         default: 1
 *         description: Page number
 *     responses:
 *       "200":
 *         description: OK
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /cmi-branches/{branchId}:
 *   patch:
 *     summary: Update a CMI branch
 *     description: Update details of a specific CMI branch.
 *     tags: [CMIBranches]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: branchId
 *         required: true
 *         schema:
 *           type: string
 *         description: CMI Branch ID
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
 */
