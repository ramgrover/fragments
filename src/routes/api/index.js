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
// Other routes (POST, DELETE, etc.) will go here later on...

// Support sending various Content-Types on the body up to 5M in size
const rawBody = () =>
    express.raw({
        inflate: true,
        limit: '5mb',
        type: (req) => {
            // See if we can parse this content type. If we can, `req.body` will be
            // a Buffer (e.g., `Buffer.isBuffer(req.body) === true`). If not, `req.body`
            // will be equal to an empty Object `{}` and `Buffer.isBuffer(req.body) === false`
            const { type } = contentType.parse(req);
            return Fragment.isSupportedType(type);
        },
    });

// Use a raw body parser for POST, which will give a `Buffer` Object or `{}` at `req.body`
router.put('/fragments/:id', rawBody(), require('./put'));

router.post('/fragments', rawBody(), require('./post'));

router.get('/fragments/:id.:ext', require('./ext'));

router.get('/fragments/:id', require('./getByID'));

router.get('/fragments/:id/info', require('./info'));

router.delete('/fragments/:id', require('./delete'));

module.exports = router;