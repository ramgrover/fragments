/**
 * The main entry-point for the v1 version of the fragments API.
 */
const express = require('express');
const contentType = require('content-type');
const { Fragment } = require('../../model/fragment');
// Create a router on which to mount our API endpoints
const router = express.Router();

// Define our first route, which will be: GET /v1/fragments
router.get('/fragments', require('./get'));

// Support sending various Content-Types on the body up to 5M in size
const rawBody = () =>
    express.raw({
      inflate: true,
      limit: '5mb',
      type: (req) => {
        const { type } = contentType.parse(req);
        return Fragment.isSupportedType(type); // Check if fragment type is supported
      },
    });

// Use a raw body parser for POST, which will give a `Buffer` Object or `{}` at `req.body`
router.post('/fragments', rawBody(), require('./post'));

// Get fragment by ID
router.get('/fragments/:id', require('../api/getByID'));
router.get('/fragments/:id.:ext', require('./getByID')); // Fixed missing `/`
router.get('/fragments/:id/info', require('./getByID'));
//console.log('Delete route handler:', require('./delete'))
router.delete('/fragments/:id', require('./delete'));
module.exports = router;
