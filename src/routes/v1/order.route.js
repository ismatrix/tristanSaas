const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const orderValidation = require('../../validations/order.validation');
const orderController = require('../../controllers/order.controller');

const router = express.Router();

// 批量提交必须放在 :orderId 的路由前，以防被解析为 orderId
router
  .route('/bulk-upsert')
  .post(auth(), validate(orderValidation.bulkUpsertOrders), orderController.bulkUpsertOrders); // 如果未来需要细分权限可以传入 auth('manageOrders')

router
  .route('/')
  .post(auth(), validate(orderValidation.createOrder), orderController.createOrder)
  .get(auth(), validate(orderValidation.getOrders), orderController.getOrders);

router
  .route('/:orderId')
  .get(auth(), validate(orderValidation.getOrder), orderController.getOrder)
  .patch(auth(), validate(orderValidation.updateOrder), orderController.updateOrder)
  .delete(auth(), validate(orderValidation.deleteOrder), orderController.deleteOrder);

module.exports = router;
