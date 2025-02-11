const { createSuccessResponse, createErrorResponse } = require('../../response');
const { Fragment } = require('../../model/fragment');
const logger = require('../../logger');

// Define supported content types
const SUPPORTED_TYPES = ['text/plain', 'text/markdown', 'application/octet-stream']; // Add more as needed

module.exports = async (req, res) => {
  logger.info(`Received POST request from user ${req.user}`);

  const contentType = req.get('Content-Type');

  // Check if content type is supported
  if (!SUPPORTED_TYPES.includes(contentType)) {
    logger.warn(`Unsupported content type: ${contentType}`);
    return res.status(415).json(createErrorResponse(415, 'The content format for fragment (supplied by client) is not supported!!'));
  }

  // Ensure req.body is a Buffer
  const fragData = req.body;
  if (!Buffer.isBuffer(fragData)) {
    logger.warn('Invalid content format. Expected Buffer.');
    return res.status(415).json(createErrorResponse(415, 'The content format for fragment must be a binary buffer.'));
  }

  const { user: ownerId } = req;

  try {
    logger.debug('Attempting to create a new fragment');
    const fragment = new Fragment({ ownerId, type: contentType });
    await fragment.save();
    logger.info(`Fragment metadata saved. ID: ${fragment.id}, Owner: ${ownerId}`);

    await fragment.setData(fragData);
    logger.info(`Fragment data saved. ID: ${fragment.id}, Size: ${fragment.size} bytes`);

    // Construct the Location URL dynamically
    const locationURL = `${req.protocol}://${req.headers.host}/v1/fragments/${fragment.id}`;
    res.set('Location', locationURL);
    res.set('Content-Type', fragment.type);

    logger.debug(`Location header set: ${locationURL}`);
    
    return res.status(201).json(
      createSuccessResponse({
        fragment: {
          id: fragment.id,
          ownerId: fragment.ownerId,
          created: fragment.created,
          updated: fragment.updated,
          type: fragment.type,
          size: fragment.size,
        }
      })
    );
  } catch (error) {
    logger.error(`Error creating fragment for user ${ownerId}: ${error.message}`);
    return res.status(500).json(createErrorResponse(500, error.message));
  }
};
