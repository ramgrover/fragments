const request = require('supertest');
const app = require('../../src/app');
const { Fragment } = require('../../src/model/fragment');

// Mock the Fragment class
jest.mock('../../src/model/fragment');

describe('DELETE /v1/fragments/:id', () => {
    // Username and password for test user
    const username = 'user1@email.com';
    const password = 'password1';

    test('unauthenticated requests are denied', async () => {
        const res = await request(app)
            .delete('/v1/fragments/test-fragment-id')
            .expect(401);
        expect(res.status).toBe(401);
    });

    test('authenticated users can delete their own fragments', async () => {
        // Mock the Fragment.byId method to return a fragment
        Fragment.byId.mockResolvedValue({
            id: 'test-fragment-id',
            ownerId: 'user123'
        });

        // Mock the Fragment.delete method to succeed
        Fragment.delete.mockResolvedValue();

        const res = await request(app)
            .delete('/v1/fragments/test-fragment-id')
            .auth(username, password);

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('ok');
        expect(Fragment.delete).toHaveBeenCalledTimes(1);
    });

    test('returns 404 when trying to delete a non-existent fragment', async () => {
        // Mock the Fragment.byId method to throw a 'Fragment not found' error
        Fragment.byId.mockRejectedValue(new Error('Fragment not found'));

        const res = await request(app)
            .delete('/v1/fragments/non-existent-id')
            .auth(username, password);

        expect(res.status).toBe(404);
        expect(res.body.status).toBe('error');
        expect(res.body.error.message).toContain('Fragment not found');
    });

    test('returns 500 when an unexpected error occurs', async () => {
        // Mock the Fragment.byId method to succeed first
        Fragment.byId.mockResolvedValue({
            id: 'test-fragment-id',
            ownerId: 'user123'
        });

        // But then make Fragment.delete throw an unexpected error
        const serverError = new Error('Database connection error');
        Fragment.delete.mockRejectedValue(serverError);

        const res = await request(app)
            .delete('/v1/fragments/test-fragment-id')
            .auth(username, password);

        expect(res.status).toBe(500);
        expect(res.body.status).toBe('error');
        expect(res.body.error.message).toBe('Database connection error');
    });
});