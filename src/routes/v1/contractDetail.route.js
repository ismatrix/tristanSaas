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
