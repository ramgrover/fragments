const request = require('supertest');
const app = require('../../src/app'); // Adjust the path to your app file if necessary

describe('404 Middleware', () => {
  it('should return a 404 error for unknown routes', async () => {
    const response = await request(app).get('/non-existent-route');
    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      status: 'error',
      error: {
        message: 'not found',
        code: 404,
      },
    });
  });
});
