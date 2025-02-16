const { createSuccessResponse } = require('../../response');
const { Fragment } = require('../../model/fragment');
const logger = require('../../logger');

/**
 * Get a list of fragments for the current user
 */
module.exports = async (req, res) => {
  try {
    const { user: ownerId } = req;  // Get user ID from request object
    logger.info(`Fetching fragments for user: ${ownerId}`);

    // Ensure the user is authenticated
    if (!ownerId) {
      logger.error('User authentication failed. No ownerId found.');
      return res.status(401).json({
        status: 'error',
        error: { code: 401, message: 'Unauthorized' },
      });
    }

    // Fetch fragments for the user from the database
    const fragments = await Fragment.byUser(ownerId);  // Use byUser method to get all fragments

    // If no fragments found, return an empty list
    if (fragments.length === 0) {
      logger.info('No fragments found for the user.');
      return res.status(200).json(createSuccessResponse({ fragments: [] }));
    }

    // Successfully found fragments, log and send the data
    logger.info(`Found ${fragments.length} fragments for user: ${ownerId}`);
    return res.status(200).json(createSuccessResponse({ fragments }));
    
  } catch (error) {
    logger.error('Error fetching fragments:', error);  // Log error details
    return res.status(500).json({
      status: 'error',
      error: { 
        code: 500,
        message: 'An error occurred while fetching user fragments.',
      },
    });
  }
};
