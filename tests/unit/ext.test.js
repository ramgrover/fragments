const { Fragment } = require('../../src/model/fragment');
const { createErrorResponse } = require('../../src/response');
const logger = require('../../src/logger');

// Mock the required modules and dependencies
jest.mock('../../src/model/fragment');
jest.mock('../../src/response');
jest.mock('../../src/logger');

jest.mock('sharp', () => {
  // Create a mock implementation of Sharp
  const mockSharp = jest.fn().mockReturnValue({
    png: jest.fn().mockReturnThis(),
    jpeg: jest.fn().mockReturnThis(),
    webp: jest.fn().mockReturnThis(),
    gif: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from('mock-converted-image'))
  });
  return mockSharp;
});

// Mock markdown-it
jest.mock('markdown-it', () => {
  return jest.fn(() => ({
    render: jest.fn((text) => `<p>${text}</p>`),
  }));
});

// Get the route handler under test
const extRoute = require('../../src/routes/api/ext');

describe('GET /fragments/:id.:ext', () => {
  // Set up mock request and response objects
  const mockRequest = (id = 'valid-id', ext = 'html', user = 'user123') => ({
    params: { id, ext },
    user,
  });

  const mockResponse = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    res.setHeader = jest.fn().mockReturnValue(res);
    return res;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    createErrorResponse.mockImplementation((code, message) => ({ code, message }));
  });

  it('should convert markdown to HTML when fragment type is text/markdown and ext is html', async () => {
    // Arrange
    const req = mockRequest('valid-id', 'html');
    const res = mockResponse();
    const mockFragmentData = Buffer.from('# Hello World');
    const convertedData = Buffer.from('<p># Hello World</p>');

    const mockFragment = {
      id: 'valid-id',
      ownerId: 'user123',
      mimeType: 'text/markdown',
      type: 'text/markdown',
      size: mockFragmentData.length,
      getData: jest.fn().mockResolvedValue(mockFragmentData),
      formats: ['text/markdown', 'text/plain', 'text/html'],
      convertData: jest.fn().mockResolvedValue(convertedData)
    };

    Fragment.byId.mockResolvedValue(mockFragment);

    // Act
    await extRoute(req, res);

    // Assert
    expect(Fragment.byId).toHaveBeenCalledWith('user123', 'valid-id');
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/html');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalled();
    expect(res.send.mock.calls[0][0].toString()).toBe('<p># Hello World</p>');
  });

  it('should return original data without conversion when ext does not require conversion', async () => {
    // Arrange
    const req = mockRequest('valid-id', 'md');
    const res = mockResponse();
    const mockFragmentData = Buffer.from('# Hello World');

    const mockFragment = {
      id: 'valid-id',
      ownerId: 'user123',
      mimeType: 'text/markdown',
      type: 'text/markdown',
      size: mockFragmentData.length,
      getData: jest.fn().mockResolvedValue(mockFragmentData),
    };

    Fragment.byId.mockResolvedValue(mockFragment);

    // Act
    await extRoute(req, res);

    // Assert
    expect(Fragment.byId).toHaveBeenCalledWith('user123', 'valid-id');
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/markdown');
    expect(res.setHeader).toHaveBeenCalledWith('Content-Length', mockFragmentData.length);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(mockFragmentData);
  });

  it('should return 404 when fragment is not found', async () => {
    // Arrange
    const req = mockRequest('invalid-id', 'html');
    const res = mockResponse();

    Fragment.byId.mockResolvedValue(null);

    // Act
    await extRoute(req, res);

    // Assert
    expect(Fragment.byId).toHaveBeenCalledWith('user123', 'invalid-id');
    expect(logger.warn).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ code: 404, message: 'Fragment not found' });
  });

  it('should convert PNG to JPEG when fragment type is image/png and ext is jpg', async () => {
    // Arrange
    const req = mockRequest('valid-id', 'jpg');
    const res = mockResponse();
    const mockFragmentData = Buffer.from('mock-png-data');
    const convertedData = Buffer.from('mock-jpeg-data');

    const mockFragment = {
      id: 'valid-id',
      ownerId: 'user123',
      mimeType: 'image/png',
      type: 'image/png',
      size: mockFragmentData.length,
      getData: jest.fn().mockResolvedValue(mockFragmentData),
      formats: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
      convertData: jest.fn().mockResolvedValue(convertedData)
    };

    Fragment.byId.mockResolvedValue(mockFragment);

    // Act
    await extRoute(req, res);

    // Assert
    expect(Fragment.byId).toHaveBeenCalledWith('user123', 'valid-id');
    expect(mockFragment.convertData).toHaveBeenCalledWith(mockFragmentData, 'image/jpeg');
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'image/jpeg');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(convertedData);
  });

  it('should return 415 when requesting an unsupported image conversion', async () => {
    // Arrange
    const req = mockRequest('valid-id', 'txt');
    const res = mockResponse();
    const mockFragmentData = Buffer.from('mock-image-data');

    const mockFragment = {
      id: 'valid-id',
      ownerId: 'user123',
      mimeType: 'image/png',
      type: 'image/png',
      size: mockFragmentData.length,
      getData: jest.fn().mockResolvedValue(mockFragmentData),
      formats: ['image/png', 'image/jpeg', 'image/webp', 'image/gif']  // No text/plain
    };

    Fragment.byId.mockResolvedValue(mockFragment);

    // Act
    await extRoute(req, res);

    // Assert
    expect(Fragment.byId).toHaveBeenCalledWith('user123', 'valid-id');
    expect(res.status).toHaveBeenCalledWith(415);
    expect(res.json).toHaveBeenCalledWith({
      code: 415,
      message: 'Conversion from image/png to text/plain is not supported'
    });
  });

  it('should handle errors when fetching fragment data', async () => {
    // Arrange
    const req = mockRequest('valid-id', 'html');
    const res = mockResponse();

    const mockFragment = {
      id: 'valid-id',
      ownerId: 'user123',
      mimeType: 'text/markdown',
      type: 'text/markdown',
      size: 100,
      getData: jest.fn().mockRejectedValue(new Error('Database error')),
    };

    Fragment.byId.mockResolvedValue(mockFragment);

    // Act
    await extRoute(req, res);

    // Assert
    expect(Fragment.byId).toHaveBeenCalledWith('user123', 'valid-id');
    expect(logger.error).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      code: 404,
      message: 'An error occurred while retrieving or converting fragment data'
    });
  });

  it('should handle errors when Fragment.byId throws an error', async () => {
    // Arrange
    const req = mockRequest('valid-id', 'html');
    const res = mockResponse();

    const error = new Error('Database connection error');
    Fragment.byId.mockRejectedValue(error);

    // Act
    await extRoute(req, res);

    // Assert
    expect(Fragment.byId).toHaveBeenCalledWith('user123', 'valid-id');
    expect(logger.error).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      code: 500,
      message: 'An error occurred while fetching the fragment'
    });
  });

  it('should handle specific "Fragment not found" error', async () => {
    // Arrange
    const req = mockRequest('valid-id', 'html');
    const res = mockResponse();

    const error = new Error('Fragment not found');
    Fragment.byId.mockRejectedValue(error);

    // Act
    await extRoute(req, res);

    // Assert
    expect(Fragment.byId).toHaveBeenCalledWith('user123', 'valid-id');
    expect(logger.error).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      code: 404,
      message: 'Fragment not found'
    });
  });
});