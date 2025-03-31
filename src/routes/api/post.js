const { createSuccessResponse, createErrorResponse } = require('../../response');
const { Fragment } = require('../../model/fragment');
const logger = require('../../logger');

module.exports = async (req, res) => {
  logger.info(`Received POST request from user ${req.user}`);
  const { user: ownerId } = req;

  // Normalize Content-Type (Remove charset if present)
  const rawContentType = req.get('Content-Type');
  const contentType = rawContentType ? rawContentType.split(';')[0].trim() : '';

  // Check if the Content-Type is supported
  if (!Fragment.isSupportedType(contentType)) {
    logger.warn(`Unsupported media type: ${contentType}`);
    return res.status(415).json(createErrorResponse(415, 'The content format for fragment (supplied by client) is not supported!!'));
  }

  try {
    // Handle different content types
    let fragData;
    if (contentType.startsWith('image/')) {
      fragData = Buffer.from(req.body); // Binary data
    } else if (contentType === 'application/json') {
      fragData = Buffer.from(JSON.stringify(req.body)); // Store JSON properly
    } else {
      fragData = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body); // Convert to Buffer
    }

    logger.debug('Attempting to create a new fragment');
    const fragment = new Fragment({ ownerId, type: contentType });
    await fragment.save();

    // Save data in buffer format
    await fragment.setData(fragData);

    logger.info(`Fragment metadata and data saved. Owner: ${ownerId}, ID: ${fragment.id}, Size: ${fragment.size} bytes`);

    // Generate the location URL for the newly created fragment
    const locationURL = `${req.protocol}://${req.headers.host}/v1/fragments/${fragment.id}`;
    res.set('Location', locationURL);

    res.status(201).location(locationURL).json(
      createSuccessResponse({
        fragment: {
          id: fragment.id,
          ownerId: fragment.ownerId,
          created: fragment.created,
          updated: fragment.updated,
          type: fragment.type,
          size: fragment.size,
        },
      })
    );
    logger.info(`Fragment created successfully for user ${ownerId}, ID: ${fragment.id}`);
  } catch (error) {
    logger.error(`Error occurred while creating fragment for user ${ownerId}: ${error.message}`, { error });
    res.status(500).json(createErrorResponse(500, error.message));
  }
};