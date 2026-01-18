const request = require('supertest');

// Version PRÉ-DI : on mock le module persistence directement
jest.mock('../../src/persistence', () => ({
    add: jest.fn().mockResolvedValue({ id: 'abc', name: 'Test', completed: false }),
}));

const { createApp } = require('../../src/app');
const app = createApp();

describe('POST /items', () => {
    test('should add a new item', async () => {
        const res = await request(app).post('/items').send({ name: 'Test' });
        expect(res.status).toBe(200);
        expect(res.body.name).toBe('Test');
    });
});