const request = require('supertest');
const express = require('express');
const getById = require('../../src/routes/api/getByID');
const { Fragment } = require('../../src/model/fragment');

jest.mock('../../src/model/fragment');

const app = express();
app.use(express.json());
app.use((req, res, next) => {
    // Properly set req.user from the header for testing
    req.user = req.headers.user || 'test-user';
    next();
});
app.get('/fragments/:id', getById);

describe('GET /fragments/:id', () => {
    it('should return a fragment if found', async () => {
        // Create test data that's exactly 10 bytes long to match the size
        const testData = Buffer.from('test data!');
        
        // Mock the Fragment.byId method to return a fragment
        const mockFragment = { 
            id: '123', 
            ownerId: 'user1', 
            type: 'text/plain; charset=utf-8', 
            size: testData.length, // Use the actual size of our test data
            getData: jest.fn().mockResolvedValue(testData)
        };
        Fragment.byId.mockResolvedValue(mockFragment);

        const response = await request(app)
            .get('/fragments/123')
            .set('user', 'user1');

        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toBe(mockFragment.type);
        expect(response.headers['content-length']).toBe(String(mockFragment.size));
        // Additional check to verify the response body matches our test data
        expect(response.text).toBe(testData.toString());
    });

    it('should return an existing fragment\'s data with the expected Content-Type', async () => {
        // Test different content types
        const testCases = [
            { type: 'text/plain; charset=utf-8', data: 'Plain text content' },
            { type: 'text/html', data: '<p>HTML content</p>' },
            { type: 'application/json', data: '{"key": "JSON content"}' },
            { type: 'text/markdown', data: '# Markdown heading' },
            { type: 'text/csv', data: 'name,age\nJohn,25' }
        ];

        for (const testCase of testCases) {
            // Create test data
            const testData = Buffer.from(testCase.data);
            
            // Mock the Fragment.byId method to return a fragment with specific content type
            const mockFragment = { 
                id: '123', 
                ownerId: 'user1', 
                type: testCase.type, 
                size: testData.length,
                getData: jest.fn().mockResolvedValue(testData)
            };
            Fragment.byId.mockResolvedValue(mockFragment);

            const response = await request(app)
                .get('/fragments/123')
                .set('user', 'user1');

            expect(response.status).toBe(200);
            expect(response.headers['content-type']).toBe(testCase.type);
            expect(response.headers['content-length']).toBe(String(testData.length));
            expect(response.text).toBe(testCase.data);
        }
    });

    it('should return 404 if fragment not found', async () => {
        // Mock the Fragment.byId method to throw an error
        const error = new Error('Fragment not found');
        Fragment.byId.mockRejectedValue(error);

        const response = await request(app)
            .get('/fragments/999')
            .set('user', 'user1');

        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty('status', 'error');
        expect(response.body.error).toHaveProperty('message', 'Fragment not found');
    });

    it('should return 500 for other errors', async () => {
        // Mock the Fragment.byId method to throw a different error
        const error = new Error('Database connection failed');
        Fragment.byId.mockRejectedValue(error);

        const response = await request(app)
            .get('/fragments/123')
            .set('user', 'user1');

        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('status', 'error');
    });
});