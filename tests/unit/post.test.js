const request = require('supertest');
const app = require('../../src/app');
describe('POST /v1/fragments', () => {
  // Authenticated vs unauthenticated requests 
  test('unauthenticated requests are denied', () => {
    return request(app)
      .post('/v1/fragments')
      .expect(401);
  });
  test('incorrect credentials are denied', () => {
    return request(app)
      .post('/v1/fragments')
      .auth('invalid@email.com', 'incorrect_password')
      .expect(401);
  });
  test('authenticated users can create a plain text fragment and responses include all necessary and expected properties', async () => {
    const res = await request(app)
      .post('/v1/fragments')
      .auth('user1@email.com', 'password1')
      .set('Content-Type', 'text/plain')
      .send('fragment type');
    const body = JSON.parse(res.text);
    expect(res.statusCode).toBe(201);
    expect(body.status).toBe('ok');
    expect(body.fragment.type).toMatch(/text\/plain/);
    expect(Object.keys(body.fragment)).toEqual([
      'id',
      'ownerId',
      'created',
      'updated',
      'type',
      'size',
    ]);
    expect(body.fragment.size).toEqual(13); // size of 'fragment type'
    // Check for Location header
    expect(res.headers.location).toBeTruthy();
    expect(res.headers.location).toMatch(/\/v1\/fragments\/\w+/); // Ensure it matches the expected URL pattern
  });
  //trying to create a fragment with an unsupported type
  test('trying to create a fragment with an unsupported type returns an error', async () => {
    const res = await request(app)
      .post('/v1/fragments')
      .auth('user1@email.com', 'password1')
      .set('Content-Type', 'image/jpeg') // Change this to any unsupported type
      .send('{}'); // Send an empty JSON object or a string
    const body = JSON.parse(res.text);
    expect(res.statusCode).toBe(415);
    expect(body.status).toBe('error');
    expect(body.error.code).toBe(415);
    expect(body.error.message).toBe('The content format for fragment (supplied by client) is not supported!!');
  });
});