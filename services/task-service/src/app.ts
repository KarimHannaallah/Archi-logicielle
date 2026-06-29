import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import type { TodoService } from './domain/TodoService';
import { makeGetItems } from './routes/getItems';
import { makeAddItem } from './routes/addItem';
import { makeUpdateItem } from './routes/updateItem';
import { makeDeleteItem } from './routes/deleteItem';
import { authMiddleware } from '@archi/shared-auth';

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

interface AppOptions {
    enableAuth?: boolean;
}

export function createApp(todoService: TodoService, options?: AppOptions) {
    const app = express();

    app.use(cors({
        origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
        credentials: true,
    }));
    app.use(express.json());

    app.get('/health', (_req, res) => res.json({ status: 'ok' }));

    if (options?.enableAuth === false) {
        app.get('/items', makeGetItems(todoService));
        app.post('/items', makeAddItem(todoService));
        app.put('/items/:id', makeUpdateItem(todoService));
        app.delete('/items/:id', makeDeleteItem(todoService));
    } else {
        app.get('/items', apiLimiter, authMiddleware, makeGetItems(todoService));
        app.post('/items', apiLimiter, authMiddleware, makeAddItem(todoService));
        app.put('/items/:id', apiLimiter, authMiddleware, makeUpdateItem(todoService));
        app.delete('/items/:id', apiLimiter, authMiddleware, makeDeleteItem(todoService));
    }

    return app;
}