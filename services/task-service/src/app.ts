import express from 'express';
import cors from 'cors';
import type { TodoService } from './domain/TodoService';
import type { AuthService } from './domain/AuthService';
import { makeGetItems } from './routes/getItems';
import { makeAddItem } from './routes/addItem';
import { makeUpdateItem } from './routes/updateItem';
import { makeDeleteItem } from './routes/deleteItem';
import { makeAuthRouter } from './routes/auth';
import { authMiddleware } from './middleware/auth';

interface AppOptions {
    authService?: AuthService;
    enableAuth?: boolean;
}

export function createApp(todoService: TodoService, options?: AppOptions) {
    const app = express();

    app.use(cors({
        origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
        credentials: true,
    }));
    app.use(express.json());

    if (options?.authService) {
        app.use('/auth', makeAuthRouter(options.authService));
    }

    if (options?.enableAuth !== false && options?.authService) {
        app.get('/items', authMiddleware, makeGetItems(todoService));
        app.post('/items', authMiddleware, makeAddItem(todoService));
        app.put('/items/:id', authMiddleware, makeUpdateItem(todoService));
        app.delete('/items/:id', authMiddleware, makeDeleteItem(todoService));
    } else {
        app.get('/items', makeGetItems(todoService));
        app.post('/items', makeAddItem(todoService));
        app.put('/items/:id', makeUpdateItem(todoService));
        app.delete('/items/:id', makeDeleteItem(todoService));
    }

    return app;
}
