import express from 'express';
import cors from 'cors';
import type { TodoService } from './domain/TodoService';
import { makeGetItems } from './routes/getItems';
import { makeAddItem } from './routes/addItem';
import { makeUpdateItem } from './routes/updateItem';
import { makeDeleteItem } from './routes/deleteItem';
import { authMiddleware } from './middleware/auth';

export function createApp(todoService: TodoService) {
    const app = express();

    app.use(cors({
        origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
        credentials: true,
    }));
    app.use(express.json());

    app.get('/items', authMiddleware, makeGetItems(todoService));
    app.post('/items', authMiddleware, makeAddItem(todoService));
    app.put('/items/:id', authMiddleware, makeUpdateItem(todoService));
    app.delete('/items/:id', authMiddleware, makeDeleteItem(todoService));

    return app;
}