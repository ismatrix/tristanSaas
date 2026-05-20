const express = require('express');
const authRoute = require('./auth.route');
const userRoute = require('./user.route');
const docsRoute = require('./docs.route');
const ibossRoute = require('./iboss.route');
const config = require('../../config/config');

const router = express.Router();

const defaultRoutes = [
  {
    path: '/auth',
    route: authRoute,
  },
  {
    path: '/users',
    route: userRoute,
  },
  {
    path: '/wildcards',
    route: require('./wildcards.route'),
  },
  {
    path: '/iboss',
    route: ibossRoute,
  },
  {
    path: '/orders',
    route: require('./order.route'),
  },
  {
    path: '/order-details',
    route: require('./orderDetail.route'),
  },
  {
    path: '/cmi-branches',
    route: require('./cmiBranch.route'),
  },
  {
    path: '/iboss-customers',
    route: require('./ibossCustomer.route'),
  },
  {
    path: '/contracts',
    route: require('./contract.route'),
  },
  {
    path: '/contract-details',
    route: require('./contractDetail.route'),
  },
  {
    path: '/dnb',
    route: require('./dnb.route'),
  },
];

const devRoutes = [
  // routes available only in development mode
  {
    path: '/docs',
    route: docsRoute,
  },
];

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

/* istanbul ignore next */
if (config.env === 'development') {
  devRoutes.forEach((route) => {
    router.use(route.path, route.route);
  });
}

module.exports = router;
