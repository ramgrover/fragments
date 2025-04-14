// Use crypto.randomUUID() to create unique IDs, see:
// https://nodejs.org/api/crypto.html#cryptorandomuuidoptions
const { randomUUID } = require('crypto');
// Use https://www.npmjs.com/package/content-type to create/parse Content-Type headers
const contentType = require('content-type');
const logger = require('../logger');
const md = require('markdown-it')();
const yaml = require('js-yaml');
const sharp = require('sharp');

// Functions for working with fragment metadata/data using our DB
const {
  readFragment,
  writeFragment,
  readFragmentData,
  writeFragmentData,
  listFragments,
  deleteFragment,
} = require('./data');

const validTypes = [
  'text/plain',
  'text/markdown',
  'text/html',
  'text/csv',
  'application/json',
  'application/yaml',
  'application/x-yaml',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/avif',
  'image/gif'
];

// validation for text/html type
const validateHtml = (data) => {
  const content = data.toString();

  // Extract all HTML tags
  const tags = content.match(/<\/?[^>]+>/g);

  // If no tags found, invalid HTML
  if (!tags) {
    return false;
  }

  const stack = [];

  for (const tag of tags) {
    // Skip self-closing tags like <br/>, <img/>
    if (tag.match(/\/\s*>$/)) {
      continue;
    }

    // If it's a closing tag
    if (tag.startsWith('</')) {
      const closeTag = tag.slice(2, -1).toLowerCase();

      // If stack is empty or doesn't match the last opening tag
      if (stack.length === 0 || stack.pop() !== closeTag) {
        return false;
      }
    }
    // If it's an opening tag
    else {
      // Extract tag name without attributes
      const openTag = tag.match(/<([a-zA-Z0-9]+)/)[1].toLowerCase();
      stack.push(openTag);
    }
  }

  // All tags should be closed (stack should be empty)
  return stack.length === 0;
};

const validateJson = (data) => {
  try {
    JSON.parse(data.toString());
    return true;
  } catch {
    return false;
  }
};

// Update the validateCsv function with the more flexible implementation
const validateCsv = (data) => {
  const content = data.toString();

  // Check if there are multiple lines
  const lines = content.trim().split(/\r?\n/);
  const hasMultipleLines = lines.length > 0;

  // Check for common separators (comma, semicolon, tab, pipe)
  const firstLine = lines[0] || '';
  const hasCommonSeparator =
    firstLine.includes(',') ||
    firstLine.includes(';') ||
    firstLine.includes('\t') ||
    firstLine.includes('|');

  return hasMultipleLines && hasCommonSeparator;
};

const validateYaml = (data) => {
  try {
    const content = data.toString();

    // Check if input is just a simple string with no YAML structure
    if (!content.includes(':')) {
      return false;
    }

    // Try to parse the YAML
    const parsed = yaml.load(content);

    // Check if the result is a proper object/map
    return typeof parsed === 'object' && parsed !== null;
  } catch {
    return false;
  }
};

class Fragment {
  constructor({
    id = randomUUID(),
    ownerId,
    created = new Date().toISOString(),
    updated = new Date().toISOString(),
    type,
    size = 0,
  }) {
    if (!ownerId) {
      throw new Error('ownerId is required');
    }
    if (!type || !Fragment.isSupportedType(type)) {
      throw new Error('Invalid or missing type');
    }
    if (typeof size !== 'number' || size < 0) {
      throw new Error('Size must be a non-negative number');
    }
    this.id = id;
    this.ownerId = ownerId;
    this.created = created;
    this.updated = updated;
    this.type = type;
    this.size = size;
  }

  /**
   * Get all fragments (id or full) for the given user
   * @param {string} ownerId user's hashed email
   * @param {boolean} expand whether to expand ids to full fragments
   * @returns Promise<Array<Fragment>>
   */
  static async byUser(ownerId, expand = false) {
    if (!ownerId) {
      logger.warn('Attempt to get fragments with missing ownerId');
      throw new Error('ownerId is required');
    }

    logger.debug({ ownerId, expand }, 'Getting fragments for user');
    const fragmentIds = await listFragments(ownerId);

    if (!expand) {
      logger.debug({ count: fragmentIds.length }, 'Returning fragment ids');
      return fragmentIds;
    }

    logger.debug('Expanding fragment ids to full fragments');
    const fragments = await Promise.all(
      fragmentIds.map(async (id) => {
        const fragmentData = await readFragment(ownerId, id);
        return new Fragment({ ownerId, ...fragmentData });
      })
    );

    logger.info({ ownerId, count: fragments.length }, 'Successfully retrieved fragments');
    return fragments;
  }

  /**
   * Gets a fragment for the user by the given id.
   * @param {string} ownerId user's hashed email
   * @param {string} id fragment's id
   * @returns Promise<Fragment>
   */
  static async byId(ownerId, id) {
    logger.debug({ ownerId, fragmentId: id }, 'Getting fragment by id');
    const fragment = await readFragment(ownerId, id);
    if (!fragment) {
      logger.warn({ ownerId, fragmentId: id }, 'Fragment not found');
      throw new Error('Fragment not found');
    }
    logger.debug({ fragmentId: id }, 'Fragment found');
    return new Fragment(fragment);
  }

  /**
   * Delete the user's fragment data and metadata for the given id
   * @param {string} ownerId user's hashed email
   * @param {string} id fragment's id
   * @returns Promise<void>
   */
  static async delete(ownerId, id) {
    logger.debug({ ownerId, fragmentId: id }, 'Attempting to delete fragment');
    try {
      await deleteFragment(ownerId, id);
      logger.info({ ownerId, fragmentId: id }, 'Fragment deleted successfully');
    } catch (error) {
      logger.error({ error, ownerId, fragmentId: id }, 'Error deleting fragment');
      throw error;
    }
  }

  /**
   * Saves the current fragment (metadata) to the database
   * @returns Promise<void>
   */
  async save() {
    logger.debug({ fragmentId: this.id }, 'Saving fragment metadata');
    this.updated = new Date().toISOString();
    try {
      await writeFragment(this);
      logger.info({ fragmentId: this.id }, 'Fragment metadata saved successfully');
    } catch (error) {
      logger.error({ error, fragmentId: this.id }, 'Error saving fragment metadata');
      throw error;
    }
  }

  /**
   * Gets the fragment's data from the database
   * @returns Promise<Buffer>
   */
  async getData() {
    logger.debug({ fragmentId: this.id }, 'Getting fragment data');
    try {
      const data = await readFragmentData(this.ownerId, this.id);
      logger.debug({ fragmentId: this.id, size: data.length }, 'Fragment data retrieved');
      return data;
    } catch (error) {
      logger.error({ error, fragmentId: this.id }, 'Error reading fragment data');
      throw error;
    }
  }

  /**
   * Set's the fragment's data in the database
   * @param {Buffer} data
   * @returns Promise<void>
   */
  async setData(data) {
    if (!data) {
      logger.warn({ fragmentId: this.id }, 'Attempt to set null or undefined data');
      throw new Error('Data cannot be null or undefined');
    }

    // Validate content based on type
    switch (this.mimeType) {
      case 'text/html':
        if (!validateHtml(data)) {
          logger.warn({ fragmentId: this.id }, 'Invalid HTML content');
          throw new Error('Invalid HTML format: missing HTML tags');
        }
        break;
      case 'application/json':
        if (!validateJson(data)) {
          logger.warn({ fragmentId: this.id }, 'Invalid JSON content');
          throw new Error('Invalid JSON format');
        }
        break;
      case 'text/csv':
        if (!validateCsv(data)) {
          logger.warn({ fragmentId: this.id }, 'Invalid CSV content');
          throw new Error('Invalid CSV format');
        }
        break;
      case 'application/yaml':
      case 'application/x-yaml':
        if (!validateYaml(data)) {
          logger.warn({ fragmentId: this.id }, 'Invalid YAML content');
          throw new Error('Invalid YAML format');
        }
        break;
    }

    logger.debug({ fragmentId: this.id, size: Buffer.byteLength(data) }, 'Setting fragment data');
    this.updated = new Date().toISOString();
    this.size = Buffer.byteLength(data);

    try {
      await writeFragment(this);
      await writeFragmentData(this.ownerId, this.id, data);
      logger.info({ fragmentId: this.id, size: this.size }, 'Fragment data saved successfully');
    } catch (error) {
      logger.error({ error, fragmentId: this.id }, 'Error setting fragment data');
      throw error;
    }
  }

  /**
   * Converts fragment data from one format to another
   * @param {Buffer} data the fragment data to convert
   * @param {string} targetType the MIME type to convert to
   * @returns {Buffer} the converted data
   * @throws {Error} if conversion is not supported or fails
   */
  async convertData(data, targetType) {
    // If the types are the same, no conversion needed
    if (this.mimeType === targetType) {
      return data;
    }

    // Image conversions
    if (this.isImage && targetType.startsWith('image/')) {
      try {
        // Use sharp for image conversions
        let converter = sharp(data);

        // Set the output format based on the target type
        switch (targetType) {
          case 'image/png':
            converter = converter.png();
            break;
          case 'image/jpeg':
            converter = converter.jpeg();
            break;
          case 'image/webp':
            converter = converter.webp();
            break;
          case 'image/gif':
            converter = converter.gif();
            break;
          default:
            throw new Error(`Unsupported image conversion target: ${targetType}`);
        }

        // Perform the conversion and return as buffer
        return await converter.toBuffer();
      } catch (error) {
        logger.error({ error, fragmentId: this.id }, 'Error converting image');
        throw new Error(`Error converting image: ${error.message}`);
      }
    }

    const sourceData = data.toString();

    // Text conversions
    if (targetType === 'text/plain') {
      if (this.mimeType === 'text/html') {
        // Remove HTML tags for plain text
        return Buffer.from(sourceData.replace(/<[^>]*>/g, ''));
      } else if (this.mimeType === 'text/markdown') {
        // Remove Markdown syntax for plain text
        return Buffer.from(
          sourceData
            .replace(/#+\s+/g, '') // Remove headings (# Heading)
            .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold (**text**)
            .replace(/\*(.*?)\*/g, '$1') // Remove italic (*text*)
            .replace(/`(.*?)`/g, '$1') // Remove inline code (`code`)
            .replace(/~~(.*?)~~/g, '$1') // Remove strikethrough (~~text~~)
            .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Replace links with just the text
            .replace(/^\s*>\s*(.*)/gm, '$1') // Remove blockquotes
            .replace(/^\s*[-*+]\s+/gm, '') // Remove list markers
            .replace(/^\s*\d+\.\s+/gm, '') // Remove numbered list markers
            .replace(/\n{2,}/g, '\n\n') // Normalize multiple newlines
        );
      } else if (this.mimeType === 'application/json') {
        // Pretty print JSON
        return Buffer.from(JSON.stringify(JSON.parse(sourceData), null, 2));
      } else if (this.mimeType === 'text/csv') {
        // CSV as text (no processing needed)
        return data;
      } else if (this.mimeType === 'application/yaml' || this.mimeType === 'application/x-yaml') {
        // YAML as text (no processing needed)
        return data;
      }
    }

    // Markdown to HTML conversion
    if (this.mimeType === 'text/markdown' && targetType === 'text/html') {
      // Use the markdown-it library
      return Buffer.from(md.render(sourceData));
    }

    // CSV to JSON conversion
    if (this.mimeType === 'text/csv' && targetType === 'application/json') {
      // Simple CSV parsing (you should use a proper CSV library)
      const lines = sourceData.trim().split('\n');
      const headers = lines[0].split(',');
      const result = [];

      for (let i = 1; i < lines.length; i++) {
        const obj = {};
        const currentLine = lines[i].split(',');
        for (let j = 0; j < headers.length; j++) {
          obj[headers[j].trim()] = currentLine[j].trim();
        }
        result.push(obj);
      }

      return Buffer.from(JSON.stringify(result));
    }

    // JSON to YAML conversion
    if (this.mimeType === 'application/json' &&
      (targetType === 'application/yaml' || targetType === 'application/x-yaml')) {
      return Buffer.from(yaml.dump(JSON.parse(sourceData)));
    }

    // YAML to JSON conversion
    if ((this.mimeType === 'application/yaml' || this.mimeType === 'application/x-yaml') &&
      targetType === 'application/json') {
      return Buffer.from(JSON.stringify(yaml.load(sourceData), null, 2));
    }

    throw new Error(`Conversion from ${this.mimeType} to ${targetType} is not implemented`);
  }

  /**
   * Returns the mime type (e.g., without encoding) for the fragment's type:
   * "text/html; charset=utf-8" -> "text/html"
   * @returns {string} fragment's mime type (without encoding)
   */
  get mimeType() {
    return contentType.parse(this.type).type;
  }

  /**
   * Returns true if this fragment is a text/* mime type
   * @returns {boolean} true if fragment's type is text/*
   */
  get isText() {
    return this.mimeType.startsWith('text/');
  }

  /**
   * Returns true if this fragment is an image/* mime type
   * @returns {boolean} true if fragment's type is image/*
   */
  get isImage() {
    return this.mimeType.startsWith('image/');
  }

  /**
   * Returns the formats into which this fragment type can be converted
   * @returns {Array<string>} list of supported mime types
   */
  get formats() {
    // All fragments can be returned as their native type
    const formats = [this.mimeType];

    // Format-specific conversions based on requirements
    switch (this.mimeType) {
      case 'text/plain':
        // Plain text has no conversions
        break;
      case 'text/markdown':
        formats.push('text/plain', 'text/html');
        break;
      case 'text/html':
        formats.push('text/plain');
        break;
      case 'text/csv':
        formats.push('text/plain', 'application/json');
        break;
      case 'application/json':
        formats.push('text/plain', 'application/yaml', 'application/x-yaml');
        break;
      case 'application/yaml':
      case 'application/x-yaml':
        formats.push('text/plain', 'application/json');
        break;
      case 'image/png':
      case 'image/jpeg':
      case 'image/webp':
      case 'image/gif':
        // All image types can be converted to any other image type
        formats.push('image/png', 'image/jpeg', 'image/webp', 'image/gif');
        break;
    }

    // Remove duplicates (in case the same format was added)
    return [...new Set(formats)];
  }

  /**
   * Returns true if we know how to work with this content type
   * @param {string} value a Content-Type value (e.g., 'text/plain' or 'text/plain: charset=utf-8')
   * @returns {boolean} true if we support this Content-Type (i.e., type/subtype)
   */
  static isSupportedType(value) {
    logger.debug({ contentType: value }, 'Checking if content type is supported');
    const { type } = contentType.parse(value);
    const isSupported = validTypes.includes(type);
    if (!isSupported) {
      logger.warn({ contentType: value }, 'Unsupported content type');
    }
    return isSupported;
  }

  /**
   * Maps file extensions to their corresponding MIME types
   */
  static get extensionToMimeType() {
    return {
      '.txt': 'text/plain',
      '.md': 'text/markdown',
      '.html': 'text/html',
      '.csv': 'text/csv',
      '.json': 'application/json',
      '.yaml': 'application/yaml',
      '.yml': 'application/yaml',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.webp': 'image/webp',
      '.gif': 'image/gif'
    };
  }

  /**
   * Maps MIME types to their corresponding file extensions
   */
  static get mimeTypeToExtension() {
    return {
      'text/plain': '.txt',
      'text/markdown': '.md',
      'text/html': '.html',
      'text/csv': '.csv',
      'application/json': '.json',
      'application/yaml': '.yaml',
      'application/x-yaml': '.yaml',
      'image/png': '.png',
      'image/jpeg': '.jpg',
      'image/webp': '.webp',
      'image/gif': '.gif'
    };
  }

  /**
   * Gets the preferred file extension for a given MIME type
   * @param {string} mimeType the MIME type
   * @returns {string} the file extension (including the dot)
   */
  static getExtensionForMimeType(mimeType) {
    return Fragment.mimeTypeToExtension[mimeType] || '';
  }
}

module.exports.Fragment = Fragment;