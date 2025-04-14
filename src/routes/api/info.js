const { Fragment } = require('../../model/fragment');
const { createSuccessResponse, createErrorResponse } = require('../../response');
const logger = require('../../logger');

/**
 * Get a fragment's metadata by its ID
 */
module.exports = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user;

        logger.debug({ userId, fragmentId: id }, 'Getting fragment metadata by id');

        // Get the fragment by ID
        const fragment = await Fragment.byId(userId, id);

        logger.info({ userId, fragmentId: id }, 'Fragment metadata retrieved successfully');

        res.status(200).json(createSuccessResponse({ fragment }));
    } catch (error) {
        logger.error({ error, userId: req.user, fragmentId: req.params.id }, 'Unable to get fragment metadata by id');
        
        if (error.message === 'Fragment not found') {
            return res.status(404).json(createErrorResponse(404, error.message));
        }
        
        res.status(500).json(createErrorResponse(500, error.message));
    }
};