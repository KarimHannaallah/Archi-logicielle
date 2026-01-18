const request = require('supertest');

jest.mock('../../src/persistence', () => ({
    update: jest.fn().mockResolvedValue(undefined),
    getById: jest.fn().mockResolvedValue({ id: '1', name: 'Test', completed: false }),
}));

const { createApp } = require('../../src/app');
const app = createApp();

describe('PUT /items/:id', () => {
    test('should update an item', async () => {
        const res = await request(app).put('/items/1').send({ name: 'Updated', completed: true });
        expect(res.status).toBe(200);
    });
});