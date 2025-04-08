const { Fragment } = require('../../model/fragment');
const { createSuccessResponse, createErrorResponse } = require('../../response');
const logger = require('../../logger');

/**
 * Get a fragment's metadata by its ID
 */
module.exports = async (req, res) => {
  const { id } = req.params;
  const userId = req.user;

  logger.debug({ userId, fragmentId: id }, 'Getting fragment metadata by id');

  try {
    const fragment = await Fragment.byId(userId, id);

    logger.info({ userId, fragmentId: id }, 'Fragment metadata retrieved successfully');
    res.status(200).json(createSuccessResponse({ fragment }));
  } catch (error) {
    logger.error({ error: error.stack || error, userId, fragmentId: id }, 'Unable to get fragment metadata by id');

    if (error.message && error.message.includes('not found')) {
      return res.status(404).json(createErrorResponse(404, 'Fragment not found'));
    }

    res.status(500).json(
      createErrorResponse(500, 'An error occurred while fetching the fragment metadata')
    );
  }
};
