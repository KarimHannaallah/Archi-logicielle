import express from 'express';
import cors from 'cors';
import type { AuthService } from './domain/AuthService';
import { makeAuthRouter } from './routes/auth';

export function createApp(authService: AuthService) {
    const app = express();
    app.use(cors({
        origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
        credentials: true,
    }));
    app.use(express.json());
    app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'auth-service' }));
    app.use('/auth', makeAuthRouter(authService));
    return app;
}