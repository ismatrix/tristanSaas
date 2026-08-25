const express = require('express');
const path = require('path');
const helmet = require('helmet');
const xss = require('xss-clean');
const mongoSanitize = require('express-mongo-sanitize');
const compression = require('compression');
const cors = require('cors');
const passport = require('passport');
const httpStatus = require('http-status');
const config = require('./config/config');
const morgan = require('./config/morgan');
const { jwtStrategy } = require('./config/passport');
const { authLimiter } = require('./middlewares/rateLimiter');
const routes = require('./routes/v1');
const { errorConverter, errorHandler } = require('./middlewares/error');
const ApiError = require('./utils/ApiError');

const app = express();

if (config.env !== 'test') {
  app.use(morgan.successHandler);
  app.use(morgan.errorHandler);
}

// set security HTTP headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'ajax.googleapis.com', 'www.amcharts.com', 'maps.google.com', 'www.google.com', 'www.gstatic.com'],
        styleSrc: ["'self'", 'https:', 'http:', "'unsafe-inline'"],
        fontSrc: ["'self'", 'https:', 'http:', 'data:', 'fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https:', 'http:'],
        connectSrc: ["'self'", 'http://localhost:3000', 'https://maps.googleapis.com', 'http://maps.googleapis.com', 'https://www.google.com'],
      },
    },
  })
);

// parse json request body
app.use(express.json({ limit: '50mb' }));

// parse urlencoded request body
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// sanitize request data
app.use(xss());
app.use(mongoSanitize());

// gzip compression
app.use(
  compression({
    level: 6,
    threshold: 1024,
  })
);

// enable cors
app.use(cors());
app.options('*', cors());

// jwt authentication
app.use(passport.initialize());
passport.use('jwt', jwtStrategy);

// limit repeated failed requests to auth endpoints
if (config.env === 'production') {
  app.use('/v1/auth', authLimiter);
}

// serve Metronic Angular SPA (built via Docker)
const ANGULAR_APP = path.join(__dirname, '..', '..', 'metronic_v5.0.5', 'theme', 'angular', 'dist', 'demo', 'default', 'app');



// serve Angular static files
app.use(express.static(ANGULAR_APP));

// v1 api routes
app.use('/v1', routes);

// SPA Fallback: send index.html for any non-api request that doesn't match a static file
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/v1')) return next();
  res.sendFile(path.join(ANGULAR_APP, 'index.html'));
});

// send back a 404 error for any unknown api request
app.use((req, res, next) => {
  next(new ApiError(httpStatus.NOT_FOUND, 'Not found'));
});

// convert error to ApiError, if needed
app.use(errorConverter);

// handle error
app.use(errorHandler);

module.exports = app;
