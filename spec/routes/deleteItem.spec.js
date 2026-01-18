const request = require('supertest');

jest.mock('../../src/persistence', () => ({
    remove: jest.fn().mockResolvedValue(undefined),
}));

const { createApp } = require('../../src/app');
const app = createApp();

describe('DELETE /items/:id', () => {
    test('should remove an item', async () => {
        const res = await request(app).delete('/items/1');
        expect(res.status).toBe(200);
    });
});