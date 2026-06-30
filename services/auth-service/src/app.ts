import express from 'express';
import cors from 'cors';
import type { AuthService } from './domain/AuthService';
import { makeAuthRouter } from './routes/auth';
import { makeAuthV2Router } from './routes/auth.v2';
const { version } = require('../package.json');

export function createApp(authService: AuthService) {
    const app = express();
    app.use(cors({
        origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
        credentials: true,
    }));
    app.use(express.json());
    app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'auth-service', version }));
    app.get('/version', (_req, res) => res.json({ service: 'auth-service', version }));
    // legacy (unversioned) — backward compatibility
    app.use('/auth', makeAuthRouter(authService));
    // v1 explicit
    app.use('/v1/auth', makeAuthRouter(authService));
    // v2 — /register requires birthDate
    app.use('/v2/auth', makeAuthV2Router(authService));
    return app;
}