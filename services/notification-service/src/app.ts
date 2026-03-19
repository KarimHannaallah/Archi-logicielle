import express from 'express';
import { authMiddleware } from './middleware/auth';
import { makeGetNotifications } from './routes/getNotifications';
import { markAllRead } from './store/notificationStore';

export function createApp() {
    const app = express();
    app.use(express.json());

    app.get('/notifications', authMiddleware, makeGetNotifications());

    app.put('/notifications/read', authMiddleware, (req, res) => {
        const userId = (req as any).userId;
        markAllRead(userId);
        res.json({ success: true });
    });

    return app;
}