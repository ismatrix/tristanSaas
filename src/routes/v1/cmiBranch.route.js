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
