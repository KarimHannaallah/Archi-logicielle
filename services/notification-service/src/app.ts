import express from 'express';
import { authMiddleware } from './middleware/auth';
import { makeGetNotifications } from './routes/getNotifications';

export function createApp() {
    const app = express();
    app.use(express.json());

    app.get('/notifications', authMiddleware, makeGetNotifications());

    return app;
}
