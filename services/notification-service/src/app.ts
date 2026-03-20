import express from 'express';
import { authMiddleware } from './middleware/auth';
import { makeGetNotifications } from './routes/getNotifications';
import { makeMarkNotificationsRead } from './routes/markNotificationsRead';

export function createApp() {
    const app = express();
    app.use(express.json());

    app.get('/notifications', authMiddleware, makeGetNotifications());
    app.put('/notifications/read', authMiddleware, makeMarkNotificationsRead());

    return app;
}
