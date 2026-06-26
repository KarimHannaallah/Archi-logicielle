import request from 'supertest';

jest.mock('@archi/shared-auth', () => ({
    authMiddleware: (_req: any, _res: any, next: any) => next(),
}));

const { createApp } = require('../src/app');

describe('notification-service app', () => {
    const app = createApp();

    it('GET /notifications retourne 200', async () => {
        const res = await request(app).get('/notifications');
        expect(res.status).toBe(200);
    });

    it('PUT /notifications/read retourne 200', async () => {
        const res = await request(app).put('/notifications/read');
        expect(res.status).toBe(200);
    });
});