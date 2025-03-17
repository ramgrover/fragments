const { Fragment } = require('../../model/fragment');
const { createSuccessResponse, createErrorResponse } = require('../../response');
const logger = require('../../logger');
module.exports = async (req, res) => {
  const { user: ownerId } = req;
  const { id , ext} = req.params;
  try {
    logger.info(`Fetching fragment by ID: ${id}`);
    const fragment = await Fragment.byId(ownerId, id);
    if (!fragment) {
      logger.warn(`Fragment not found for ID: ${id}`);
      return res.status(404).json(createErrorResponse(404, 'Fragment not found'));
    }
    if (ext) {
      const { convertedData, convertedType } = await fragment.convertType(await fragment.getData(), ext);
      if (!convertedData) {
        return res.status(415).json(createErrorResponse(415, 'Fragment can\'t be converted to this type or extension is invalid'));
      }
      // Return the converted fragment data
      logger.info(`Successfully converted and fetched fragment: ${id}`);
      res.set('Content-Type', convertedType);
      return res.status(200).json(createSuccessResponse({content: convertedData}));
    }

    logger.info(`Successfully fetched fragment: ${JSON.stringify(fragment)}`);
    res.status(200).json(createSuccessResponse({ fragment }));
  } catch (error) {
    logger.error(`Error fetching fragment with ID ${id}: ${error.message}`, { error });
    res.status(500).json(createErrorResponse(500, 'An error occurred while fetching the fragment'));
  }
};