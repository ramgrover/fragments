const { Fragment } = require('../../model/fragment');
const { createSuccessResponse, createErrorResponse } = require('../../response');
const logger = require('../../logger');

/**
 * Update a fragment's data by its ID
 */
module.exports = async (req, res) => {
  const { id } = req.params;
  const userId = req.user;
  const contentType = req.get('Content-Type');

  logger.debug({ contentType: req.get('Content-Type'), size: req.body?.length }, 'Attempting to update fragment');

  // Check if any data was provided
  if (!req.body || Object.keys(req.body).length === 0) {
    logger.warn({ err: 'Empty buffer', data: req.body }, 'Empty fragment data received');
    return res.status(400).json(createErrorResponse(400, 'Fragment data missing'));
  }

  // Check if the content type is supported - this needs to return 415 for unsupported types
  if (!Fragment.isSupportedType(contentType)) {
    logger.warn({ contentType: req.get('Content-Type') }, 'Invalid fragment data, unsupported content type');
    return res.status(415).json(createErrorResponse(415, 'Unsupported content type'));
  }

  try {
    // Get the fragment by ID
    const fragment = await Fragment.byId(userId, id);

    // Check if the content type matches the existing fragment's type
    if (fragment.type !== contentType) {
      logger.warn({
        originalType: fragment.type,
        requestType: contentType
      }, 'Content type mismatch');
      return res.status(400).json(
        createErrorResponse(400, 'Content type cannot be changed when updating a fragment')
      );
    }

    try {
      await fragment.setData(req.body);

      // Return the updated fragment
      logger.info({ fragmentId: fragment.id, size: fragment.size }, 'Fragment updated successfully');
      return res.status(200).json(createSuccessResponse({ fragment }));
    } catch (error) {
      // This is likely a database error or other serious error, so return 500
      logger.error({ error, userId, fragmentId: id }, 'Error saving fragment data');
      return res.status(500).json(createErrorResponse(500, error.message));
    }
  } catch (error) {
    // Log the error but provide a specific message
    logger.error({ error, userId, fragmentId: id }, 'Error updating fragment');

    // If the fragment doesn't exist, return a 404
    if (error.message === 'Fragment not found') {
      logger.warn({ userId, fragmentId: id }, 'Fragment not found for update');
      return res.status(404).json(createErrorResponse(404, error.message));
    }

    // For any other error, return a 500 server error
    return res.status(500).json(createErrorResponse(500, error.message));
  }
};