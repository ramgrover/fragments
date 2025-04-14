const request = require('supertest');
const app = require('../../src/app');
const { Fragment } = require('../../src/model/fragment');

// Mock the Fragment class
jest.mock('../../src/model/fragment');

describe('PUT /v1/fragments/:id', () => {
  // Username and password for test user
  const username = 'user1@email.com';
  const password = 'password1';

  // Setup mock data
  const originalData = 'Original text content';
  const updatedData = 'Updated text content';
  const contentType = 'text/plain';

  // Mock fragment object that the byId() method will return
  const mockFragment = {
    id: 'test-fragment-id',
    ownerId: 'user123',
    type: contentType,
    size: originalData.length,
    setData: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    Fragment.isSupportedType.mockImplementation((type) => {
      return ['text/plain', 'text/html'].includes(type);
    });
  });


  test('unauthenticated requests are denied', async () => {
    const res = await request(app)
      .put('/v1/fragments/test-fragment-id')
      .set('Content-Type', contentType)
      .send(updatedData);

    expect(res.status).toBe(401);
  });

  test('authenticated users can update their fragments', async () => {
    // Mock Fragment.byId to return our mock fragment
    Fragment.byId.mockResolvedValue(mockFragment);

    const res = await request(app)
      .put('/v1/fragments/test-fragment-id')
      .auth(username, password)
      .set('Content-Type', contentType)
      .send(updatedData);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(Fragment.byId).toHaveBeenCalledWith(expect.any(String), 'test-fragment-id');
    expect(mockFragment.setData).toHaveBeenCalledWith(Buffer.from(updatedData));
  });

  test('returns 404 when trying to update a non-existent fragment', async () => {
    // Mock Fragment.byId to throw a 'Fragment not found' error
    Fragment.byId.mockRejectedValue(new Error('Fragment not found'));

    const res = await request(app)
      .put('/v1/fragments/non-existent-id')
      .auth(username, password)
      .set('Content-Type', contentType)
      .send(updatedData);

    expect(res.status).toBe(404);
    expect(res.body.status).toBe('error');
    expect(res.body.error.message).toBe('Fragment not found');
  });

  test('returns 400 when trying to update with a different content type', async () => {
    // Mock Fragment.byId to return our mock fragment (which has text/plain type)
    Fragment.byId.mockResolvedValue(mockFragment);

    const res = await request(app)
      .put('/v1/fragments/test-fragment-id')
      .auth(username, password)
      .set('Content-Type', 'text/html')
      .send('<p>Updated HTML content</p>');

    expect(res.status).toBe(400);
    expect(res.body.status).toBe('error');
    expect(res.body.error.message).toBe('Content type cannot be changed when updating a fragment');
  });

  test('returns 400 when trying to update with empty data', async () => {
    const res = await request(app)
      .put('/v1/fragments/test-fragment-id')
      .auth(username, password)
      .set('Content-Type', contentType)
      .send();

    expect(res.status).toBe(400);
    expect(res.body.status).toBe('error');
    expect(res.body.error.message).toBe('Fragment data missing');
  });

  test('returns 500 when an unexpected error occurs', async () => {
    // Mock Fragment.byId to return our mock fragment
    Fragment.byId.mockResolvedValue(mockFragment);

    // But then make setData throw an unexpected error
    const serverError = new Error('Database connection error');
    mockFragment.setData.mockRejectedValue(serverError);

    const res = await request(app)
      .put('/v1/fragments/test-fragment-id')
      .auth(username, password)
      .set('Content-Type', contentType)
      .send(updatedData);

    expect(res.status).toBe(500);
    expect(res.body.status).toBe('error');
    expect(res.body.error.message).toBe('Database connection error');
  });
});