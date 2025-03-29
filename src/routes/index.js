// src/routes/index.js
const { hostname } = require('os');
const express = require('express');
const { authenticate } = require('../auth');

const { version, author } = require('../../package.json');
const { createSuccessResponse } = require('../response');
const router = express.Router();

router.use(`/v1`, authenticate(),require('./api'));
router.use((req, res, next) => {
  if (!req.headers['content-type']) {
    req.headers['content-type'] = 'text/plain';
 }
next();
});

router.get('/', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache');
  res.status(200).json(
    createSuccessResponse({
    status: 'ok',
    author,
    githubUrl: 'https://github.com/ramgrover/fragments',
    version,
    hostname: hostname(),
  }));
});

module.exports = router;