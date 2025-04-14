const request = require('supertest');
const app = require('../../src/app');
const { Fragment } = require('../../src/model/fragment');

// Mock the Fragment class
jest.mock('../../src/model/fragment');

describe('GET /v1/fragments/:id/info', () => {
    // Username and password for test user
    const username = 'user1@email.com';
    const password = 'password1';

    const mockFragment = {
        id: 'test-fragment-id',
        ownerId: 'user123',
        type: 'text/plain',
        size: 256,
        created: '2023-01-01T12:00:00.000Z',
        updated: '2023-01-02T12:00:00.000Z'
    };

    test('unauthenticated requests are denied', async () => {
        const res = await request(app)
            .get('/v1/fragments/test-fragment-id/info')
            .expect(401);

        expect(res.status).toBe(401);
    });

    test('authenticated users can get metadata for their fragments', async () => {
        // Mock the Fragment.byId method to return a fragment
        Fragment.byId.mockResolvedValue(mockFragment);

        const res = await request(app)
            .get('/v1/fragments/test-fragment-id/info')
            .auth(username, password);

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('ok');
        expect(res.body.fragment).toEqual(mockFragment);
        expect(Fragment.byId).toHaveBeenCalledTimes(1);
    });

    test('returns 404 when requesting metadata for a non-existent fragment', async () => {
        // Mock the Fragment.byId method to throw a 'Fragment not found' error
        Fragment.byId.mockRejectedValue(new Error('Fragment not found'));

        const res = await request(app)
            .get('/v1/fragments/non-existent-id/info')
            .auth(username, password);

        expect(res.status).toBe(404);
        expect(res.body.status).toBe('error');
        expect(res.body.error.message).toBe('Fragment not found');
    });

    test('returns 500 when an unexpected error occurs', async () => {
        // Mock the Fragment.byId method to throw an unexpected error
        const serverError = new Error('Database connection error');
        Fragment.byId.mockRejectedValue(serverError);

        const res = await request(app)
            .get('/v1/fragments/test-fragment-id/info')
            .auth(username, password);

        expect(res.status).toBe(500);
        expect(res.body.status).toBe('error');
        expect(res.body.error.message).toBe('Database connection error');
    });

    test('response includes correct content type and format information', async () => {
        // Mock the Fragment.byId method to return a fragment with formats
        const mockFragmentWithFormats = {
            ...mockFragment,
            formats: ['text/plain'],
            isText: true,
            mimeType: 'text/plain'
        };

        Fragment.byId.mockResolvedValue(mockFragmentWithFormats);

        const res = await request(app)
            .get('/v1/fragments/test-fragment-id/info')
            .auth(username, password);

        expect(res.status).toBe(200);
        expect(res.body.fragment).toEqual(mockFragmentWithFormats);
        expect(res.body.fragment.formats).toEqual(['text/plain']);
        expect(res.body.fragment.isText).toBe(true);
        expect(res.body.fragment.mimeType).toBe('text/plain');
    });
});