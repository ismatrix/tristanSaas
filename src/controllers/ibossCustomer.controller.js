const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { ibossCustomerService } = require('../services');
const pick = require('../utils/pick');

const syncCustomers = catchAsync(async (req, res) => {
  const result = await ibossCustomerService.bulkUpsertCustomers(req.body);
  res.status(httpStatus.CREATED).send(result);
});

const getCustomers = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['enterpriseName', 'custId']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await ibossCustomerService.queryCustomers(filter, options);
  res.send(result);
});

module.exports = {
  syncCustomers,
  getCustomers,
};
