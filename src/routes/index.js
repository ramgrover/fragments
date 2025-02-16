// src/routes/index.js

const express = require('express');
// Our authentication middleware
const { authenticate } = require('../auth');

// version and author from package.json
const { version, author } = require('../../package.json');
const { createSuccessResponse } = require('../response');
// Create a router that we can use to mount our API
const router = express.Router();

/**
 * Expose all of our API routes on /v1/* to include an API version.
 */
router.use(`/v1`, authenticate(),require('./api'));
router.use((req, res, next) => {
  if (!req.headers['content-type']) {
    req.headers['content-type'] = 'text/plain';
 }
next();
});
/**
 * Define a simple health check route. If the server is running
 * we'll respond with a 200 OK.  If not, the server isn't healthy.
 */
router.get('/', (req, res) => {
  // Client's shouldn't cache this response (always request it fresh)
  res.setHeader('Cache-Control', 'no-cache');
  // Send a 200 'OK' response
  res.status(200).json(
    createSuccessResponse({
    status: 'ok',
    author,
    // Use your own GitHub URL for this!
    githubUrl: 'https://github.com/ramgrover/fragments',
    version,
  }));
});
/**
 * Expose all of our API routes on /v1/* to include an API version.
 * Protect them all with middleware so you have to be authenticated
 * in order to access things.
 */

module.exports = router;