const { createSuccessResponse, createErrorResponse } = require('../../response');
const { Fragment } = require('../../model/fragment');
const logger = require('../../logger');

/**
 * Get a list of fragments for the current user.
 * Supports `expand=1` to return full metadata instead of just fragment IDs.
 */
module.exports = async (req, res) => {
  logger.info(`Received GET request from user ${req.user}`);

  // Check if `expand=1` is in the query parameters
  const expandFlag = req.query['expand'] === '1';
  const { user: ownerId } = req;

  try {
    logger.debug(`Attempting to fetch fragments for user: ${ownerId}, expand: ${expandFlag}`);

    // Fetch fragments based on the expand flag
    const fragments = await Fragment.byUser(ownerId, expandFlag);

    // Log the number of fragments retrieved
    logger.info(`Found ${fragments.length} fragments for user ${ownerId}`);

    // Return response with fragments
    res.status(200).json(createSuccessResponse({ fragments: [...fragments] }));
    logger.info(`Successfully fetched fragments for user ${ownerId}`);
    
  } catch (error) {
    logger.error(`Error occurred while fetching fragments for user ${ownerId}: ${error.message}`);
    res.status(500).json(createErrorResponse(500, 'An error occurred while fetching user fragments.'));
  }
};