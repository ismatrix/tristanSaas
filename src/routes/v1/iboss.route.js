const express = require('express');
const ibossController = require('../../controllers/iboss.controller');

const router = express.Router();

router.post('/getOrdersByParam', ibossController.getOrdersByParam);

module.exports = router;
