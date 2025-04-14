const { Fragment } = require('../../model/fragment');
const { createErrorResponse } = require('../../response');
const logger = require('../../logger');

/**
 * Get a fragment's data by its ID with optional format conversion based on extension
 */
module.exports = async (req, res) => {
  const userId = req.user;
  const { id, ext } = req.params;

  try {
    logger.info(`Fetching fragment by ID: ${id} with conversion to .${ext}`);

    // Get the fragment by ID
    const fragment = await Fragment.byId(userId, id);

    if (!fragment) {
      logger.warn(`Fragment not found for ID: ${id}`);
      return res.status(404).json(createErrorResponse(404, 'Fragment not found'));
    }

    try {
      // Get the data
      const data = await fragment.getData();

      // Map extension to MIME type
      const extensionMap = {
        'txt': 'text/plain',
        'md': 'text/markdown',
        'html': 'text/html',
        'json': 'application/json',
        'csv': 'text/csv',
        'yaml': 'application/yaml',
        'yml': 'application/yaml',
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'webp': 'image/webp',
        'gif': 'image/gif'
      };

      const targetType = extensionMap[ext];

      // If extension not recognized, return 415
      if (!targetType) {
        logger.warn(`Unsupported extension: .${ext}`);
        return res.status(415).json(createErrorResponse(415, `Unsupported extension: .${ext}`));
      }

      // If no conversion needed, return original
      if (fragment.mimeType === targetType) {
        res.setHeader('Content-Type', fragment.type);
        res.setHeader('Content-Length', fragment.size);
        return res.status(200).send(data);
      }

      // Check if the requested conversion is supported for this fragment type
      if (!fragment.formats.includes(targetType)) {
        logger.warn(`Unsupported conversion from ${fragment.mimeType} to ${targetType}`);
        return res.status(415).json(createErrorResponse(415,
          `Conversion from ${fragment.mimeType} to ${targetType} is not supported`));
      }

      // Convert the data
      const convertedData = await fragment.convertData(data, targetType);

      // Set appropriate headers for content type
      res.setHeader('Content-Type', targetType);
      res.setHeader('Content-Length', Buffer.byteLength(convertedData));

      return res.status(200).send(convertedData);

    } catch (dataError) {
      logger.error(`Error retrieving or converting fragment data with ID ${id}: ${dataError.message}`, { error: dataError });
      res.status(404).json(createErrorResponse(404, 'An error occurred while retrieving or converting fragment data'));
    }
  } catch (error) {
    logger.error(`Error fetching fragment with ID ${id}: ${error.message}`, { error });

    if (error.message === 'Fragment not found') {
      return res.status(404).json(createErrorResponse(404, error.message));
    }

    res.status(500).json(createErrorResponse(500, 'An error occurred while fetching the fragment'));
  }
};