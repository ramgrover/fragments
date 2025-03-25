// src/app.js

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const { createErrorResponse } = require('./response');
// author and version from our package.json file
//const { author, version } = require('../package.json');
const logger = require('./logger');
const pino = require('pino-http')({
  // Use our default logger instance, which is already configured
  logger,
});
// Create an express app instance we can use to attach middleware and HTTP routes
const app = express();
// modifications to src/app.js
const passport = require('passport');
const authenticate = require('./auth');
// Use gzip/deflate compression middleware
app.use(compression());
app.use(express.json());
// Set up our passport authentication middleware
passport.use(authenticate.strategy());
app.use(passport.initialize());

// Use pino logging middleware
app.use(pino);

// Use helmetjs security middleware
app.use(helmet());

// Use CORS middleware so we can make requests across origins
app.use(cors());

// Use gzip/deflate compression middleware
app.use(compression());

app.use('/', require('./routes'));

app.get('/error', (req, res, next) => {
  // Simulate an internal server error
  next(new Error('Internal server error'));
});

app.get('/bad-request', (req, res) => {
  res.status(400).json({
    status: 'error',
    error: {
      message: 'Bad Request',
      code: 400,
    },
  });
});

app.get('/error-without-message', (req, res, next) => {
  const error = new Error();
  error.status = 503; // Simulate a server error with a specific status
  next(error);
});

// Simulate unauthorized access
app.get('/private-route', (req, res) => {
  // Here you might normally check for authentication
  res.status(401).json({
    status: 'error',
    error: {
      message: 'Unauthorized access',
      code: 401,
    },
  });
});

// Handle valid and invalid POST data
app.post('/data-route', (req, res) => {
  const { key } = req.body;
  if (key === 'validData') {
    res.status(200).json({ message: 'Data is valid' });
  } else {
    res.status(400).json({
      status: 'error',
      error: {
        message: 'Invalid data',
        code: 400,
      },
    });
  }
});

// Add 404 middleware to handle any requests for resources that can't be found
app.use((req, res) => {
  res.status(404).json(createErrorResponse(404, 'not found'));
});

// Add error-handling middleware to deal with anything else
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // We may already have an error response we can use, but if not,
  // use a generic `500` server error and message.
  const status = err.status || 500;
  const message = err.message || 'unable to process request';

  // If this is a server error, log something so we can see what's going on.
  if (status > 499) {
    logger.error({ err }, `Error processing request`);
  }

  res.status(status).json(createErrorResponse(status, message));
});

// Export our `app` so we can access it in server.js
module.exports = app;