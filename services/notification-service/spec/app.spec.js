const request = require('supertest');

jest.mock('@archi/shared-auth', () => ({
    authMiddleware: (_req, _res, next) => next(),
}));

const { createApp } = require('../src/app');

describe('notification-service — app routes', () => {
    const app = createApp();

    test('GET /notifications retourne 200', async () => {
        const res = await request(app).get('/notifications');
        expect(res.status).toBe(200);
    });

    test('PUT /notifications/read retourne 200', async () => {
        const res = await request(app).put('/notifications/read');
        expect(res.status).toBe(200);
    });
});