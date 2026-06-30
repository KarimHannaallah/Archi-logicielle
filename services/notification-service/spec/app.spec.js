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

    test('GET /health retourne 200', async () => {
        const res = await request(app).get('/health');
        expect(res.status).toBe(200);
    });

    test('GET /notifications avec userId retourne les notifications de l\'user', async () => {
        const res = await request(app)
            .get('/notifications')
            .set('x-user-id', 'user-1');
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });

    test('PUT /notifications/read avec userId retourne ok', async () => {
        const res = await request(app)
            .put('/notifications/read')
            .set('x-user-id', 'user-1');
        expect(res.status).toBe(200);
        expect(res.body.ok).toBe(true);
    });
});