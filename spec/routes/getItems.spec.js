const request = require('supertest');

jest.mock('../../src/persistence', () => ({
    getAll: jest.fn().mockResolvedValue([
        { id: '1', name: 'Item 1', completed: false },
    ]),
}));

const { createApp } = require('../../src/app');
const app = createApp();

describe('GET /items', () => {
    test('should return all items', async () => {
        const res = await request(app).get('/items');
        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(1);
    });
});