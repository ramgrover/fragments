const { Fragment } = require('../../model/fragment');
const { createSuccessResponse, createErrorResponse } = require('../../response');
const logger = require('../../logger');

module.exports = async (req, res) => {
  const { user: ownerId } = req;
  const { id } = req.params;

  try {
    logger.info(`Fetching metadata for fragment ID: ${id} for user: ${ownerId}`);

    // Retrieve fragment metadata
    const fragment = await Fragment.byId(ownerId, id);
    if (!fragment) {
      logger.warn(`Fragment metadata not found for ID: ${id}`);
      return res.status(404).json(createErrorResponse(404, 'Fragment not found'));
    }

    // Return only the metadata
    logger.info(`Successfully fetched fragment metadata for ID: ${id}`);
    return res.status(200).json(createSuccessResponse({ fragment }));

  } catch (error) {
    logger.error(`Error fetching fragment metadata with ID ${id}: ${error.message}`, { error });
    return res.status(500).json(createErrorResponse(500, 'An error occurred while fetching the fragment metadata'));
  }
};
