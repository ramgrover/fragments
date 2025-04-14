const request = require('supertest');
const app = require('../../src/app');
const hash = require('../../src/hash');

describe('POST /v1/fragments', () => {
  const username = 'user1@email.com';
  const password = 'password1';

  const textData = 'Hello World!';
  const contentType = 'text/plain';

  test('unauthenticated requests are denied', async () => {
    const res = await request(app)
      .post('/v1/fragments')
      .send(textData);

    expect(res.statusCode).toBe(401);
  });

  test('authenticated users can create a plain text fragment', async () => {
    const res = await request(app)
      .post('/v1/fragments')
      .auth(username, password)
      .set('Content-Type', contentType)
      .send(textData);

    expect(res.statusCode).toBe(201);
    expect(res.body.status).toBe('ok');

    // Check the fragment data
    const { fragment } = res.body;
    expect(fragment).toMatchObject({
      id: expect.any(String),
      ownerId: expect.any(String),
      created: expect.any(String),
      updated: expect.any(String),
      type: contentType,
      size: textData.length,
    });

    // Verify dates are valid ISO 8601 format
    expect(new Date(fragment.created).toISOString()).toBe(fragment.created);
    expect(new Date(fragment.updated).toISOString()).toBe(fragment.updated);
  });

  test('response includes a Location header with a full URL', async () => {
    const res = await request(app)
      .post('/v1/fragments')
      .auth(username, password)
      .set('Content-Type', contentType)
      .send(textData);

    expect(res.headers.location).toBeDefined();

    // Location header should be a valid URL
    const locationURL = new URL(res.headers.location);
    expect(locationURL.pathname).toMatch(/^\/v1\/fragments\/[a-zA-Z0-9-]+$/);

    // Extract the fragment id from the URL
    const fragmentId = locationURL.pathname.split('/').pop();
    expect(res.body.fragment.id).toBe(fragmentId);
  });

  test('trying to create fragment with unsupported type returns 415', async () => {
    const res = await request(app)
      .post('/v1/fragments')
      .auth(username, password)
      .set('Content-Type', 'application/pdf')
      .send(Buffer.from([1, 2, 3, 4]));

    expect(res.statusCode).toBe(415);
    expect(res.body.status).toBe('error');
    expect(res.body.error.message).toBe('Unsupported Media Type');
  });

  test('fragments are created with correct metadata', async () => {
    const res = await request(app)
      .post('/v1/fragments')
      .auth(username, password)
      .set('Content-Type', contentType)
      .send(textData);

    const { fragment } = res.body;

    // Verify all required properties exist
    expect(fragment).toHaveProperty('id');
    expect(fragment).toHaveProperty('ownerId');
    expect(fragment).toHaveProperty('created');
    expect(fragment).toHaveProperty('updated');
    expect(fragment).toHaveProperty('type');
    expect(fragment).toHaveProperty('size');

    // Verify values are correct
    expect(fragment.ownerId).toBe(hash(username));
    expect(fragment.type).toBe(contentType);
    expect(fragment.size).toBe(textData.length);
  });

  test('empty fragments are not allowed', async () => {
    const res = await request(app)
      .post('/v1/fragments')
      .auth(username, password)
      .set('Content-Type', contentType)
      .send();

    expect(res.statusCode).toBe(400);
    expect(res.body.status).toBe('error');
    expect(res.body.error.message).toBe('Fragment data missing');
  });

  test('can create a text/markdown fragment', async () => {
    const res = await request(app)
      .post('/v1/fragments')
      .auth(username, password)
      .set('Content-Type', 'text/markdown')
      .send('# Markdown Test');

    expect(res.statusCode).toBe(201);
    expect(res.body.status).toBe('ok');
    expect(res.body.fragment.type).toBe('text/markdown');
  });

  test('can create a text/html fragment', async () => {
    const res = await request(app)
      .post('/v1/fragments')
      .auth(username, password)
      .set('Content-Type', 'text/html')
      .send('<h1>HTML Test</h1>');

    expect(res.statusCode).toBe(201);
    expect(res.body.status).toBe('ok');
    expect(res.body.fragment.type).toBe('text/html');
  });

  test('can create an application/json fragment', async () => {
    const res = await request(app)
      .post('/v1/fragments')
      .auth(username, password)
      .set('Content-Type', 'application/json')
      .send({ key: "value" });
    expect(res.statusCode).toBe(201);
    expect(res.body.status).toBe('ok');
    expect(res.body.fragment.type).toBe('application/json');
  });

  test('can create a text/csv fragment', async () => {
    const res = await request(app)
      .post('/v1/fragments')
      .auth(username, password)
      .set('Content-Type', 'text/csv')
      .send('header1,header2\nvalue1,value2');

    expect(res.statusCode).toBe(201);
    expect(res.body.status).toBe('ok');
    expect(res.body.fragment.type).toBe('text/csv');
  });

  test('rejects invalid HTML content', async () => {
    const res = await request(app)
      .post('/v1/fragments')
      .auth(username, password)
      .set('Content-Type', 'text/html')
      .send('Invalid HTML without tags');

    expect(res.statusCode).toBe(400);
    expect(res.body.status).toBe('error');
    expect(res.body.error.message).toContain('Invalid HTML format');
  });

  test('accepts valid HTML content', async () => {
    const res = await request(app)
      .post('/v1/fragments')
      .auth(username, password)
      .set('Content-Type', 'text/html')
      .send('<p>Valid HTML with tags</p>');

    expect(res.statusCode).toBe(201);
    expect(res.body.status).toBe('ok');
  });

  test('rejects invalid JSON content', async () => {
    const res = await request(app)
      .post('/v1/fragments')
      .auth(username, password)
      .set('Content-Type', 'application/json')
      .send('Invalid JSON');

    expect(res.statusCode).toBe(400);
    expect(res.body.status).toBe('error');
    expect(res.body.error.message).toContain('Invalid JSON format');
  });

  test('rejects invalid CSV content', async () => {
    const res = await request(app)
      .post('/v1/fragments')
      .auth(username, password)
      .set('Content-Type', 'text/csv')
      .send('Invalid CSV without commas');

    expect(res.statusCode).toBe(400);
    expect(res.body.status).toBe('error');
    expect(res.body.error.message).toContain('Invalid CSV format');
  });

  test('rejects invalid YAML content', async () => {
    const res = await request(app)
      .post('/v1/fragments')
      .auth(username, password)
      .set('Content-Type', 'application/yaml')
      .send('invalid: yaml"": : value without proper structure');

    expect(res.statusCode).toBe(400);
    expect(res.body.status).toBe('error');
    expect(res.body.error.message).toContain('Invalid YAML format');
  });
});