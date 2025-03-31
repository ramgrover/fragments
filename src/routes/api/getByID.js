const { Fragment } = require('../../model/fragment');
const { createErrorResponse } = require('../../response');
const logger = require('../../logger');

/**
 * Get a fragment's data by its ID
 */
module.exports = async (req, res) => {
    const { id } = req.params;
    const userId = req.user;

    try {
        logger.info(`Fetching fragment by ID: ${id}`);

        // Get the fragment by ID
        const fragment = await Fragment.byId(userId, id);

        if (!fragment) {
            logger.warn(`Fragment not found for ID: ${id}`);
            return res.status(404).json(createErrorResponse(404, 'Fragment not found'));
        }

        try {
            // Get the data
            const data = await fragment.getData();

            // Set the proper Content-Type header based on the fragment's type
            res.setHeader('Content-Type', fragment.type);
            // Set the Content-Length header
            res.setHeader('Content-Length', fragment.size);

            // Send the data back
            res.status(200).send(data);

            logger.info(`Successfully sent fragment data for ID: ${id}`);
        } catch (dataError) {
            logger.error(`Error retrieving fragment data with ID ${id}: ${dataError.message}`, { error: dataError });
            res.status(404).json(createErrorResponse(404, 'An error occurred while retrieving fragment data'));
        }
    } catch (error) {
        logger.error(`Error fetching fragment with ID ${id}: ${error.message}`, { error });

        if (error.message === 'Fragment not found') {
            return res.status(404).json(createErrorResponse(404, error.message));
        }

        res.status(500).json(createErrorResponse(500, 'An error occurred while fetching the fragment'));
    }
};