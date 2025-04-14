const { Fragment } = require('../../model/fragment');
const { createSuccessResponse, createErrorResponse } = require('../../response');
const logger = require('../../logger');

/**
 * Post a new fragment
 */

module.exports = async (req, res) => {
  logger.debug({ contentType: req.get('Content-Type'), size: req.body?.length }, 'Attempting to create new fragment');

  // Check if we got a Buffer (i.e., raw body was parsed)
  if (!Buffer.isBuffer(req.body)) {
    logger.warn({ contentType: req.get('Content-Type') }, 'Invalid fragment data, request body must be raw data');
    return res.status(415).json(
      createErrorResponse(415, 'Unsupported Media Type')
    );
  }

  // Check if the buffer is empty
  if (req.body.length === 0) {
    logger.warn({ err: 'Empty buffer', data: req.body }, 'Empty fragment data received');
    return res.status(400).json(
      createErrorResponse(400, 'Fragment data missing')
    );
  }

  try {
    logger.debug({ userId: req.user, contentType: req.get('Content-Type') }, 'Creating new fragment');

    // Create a new fragment using the posted data
    const fragment = new Fragment({
      ownerId: req.user,
      type: req.get('Content-Type')
    });

    // Set the fragment's data
    try {

      await fragment.setData(req.body);
    } catch (err) {
      // Return 400 for validation errors
      if (err.message.includes('Invalid HTML format') ||
        err.message.includes('Invalid JSON format') ||
        err.message.includes('Invalid CSV format')) {
        return res.status(400).json(createErrorResponse(400, err.message));
      }
      throw err; // Re-throw other errors
    }

    await fragment.save();

    const apiUrl = process.env.API_URL || `http://${req.headers.host}`;
    const locationUrl = new URL(`/v1/fragments/${fragment.id}`, apiUrl);

    logger.info({ fragmentId: fragment.id, size: fragment.size }, 'New fragment created successfully');

    // Return successful response with Location header
    res.location(locationUrl.href)
      .status(201)
      .json(createSuccessResponse({
        fragment: fragment
      }));

  } catch (error) {
    // Handle validation errors specifically
    if (error.message.includes('Invalid YAML format')) {
      logger.warn({ error, userId: req.user }, 'Validation error creating fragment');
      return res.status(400).json(createErrorResponse(400, error.message));
    }

    // Log unexpected errors and return a 500 status code
    logger.error({ error, userId: req.user }, 'Unexpected error creating fragment');
    return res.status(500).json(createErrorResponse(500, error.message));
  }
};