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
