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
