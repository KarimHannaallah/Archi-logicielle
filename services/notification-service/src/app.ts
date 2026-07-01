import express from 'express';
import rateLimit from 'express-rate-limit';
import { authMiddleware } from '@archi/shared-auth';
import { makeGetNotifications } from './routes/getNotifications';
import { makeMarkNotificationsRead } from './routes/markNotificationsRead';
import { version } from 'os';

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

export function createApp() {
    const app = express();
    app.use(express.json());

    app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'notification-service', version }));
    
    app.get('/notifications', apiLimiter, authMiddleware, makeGetNotifications());
    app.put('/notifications/read', apiLimiter, authMiddleware, makeMarkNotificationsRead());

    return app;
}