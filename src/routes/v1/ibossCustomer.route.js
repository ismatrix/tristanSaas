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
