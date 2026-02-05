import express from 'express';
import cors from 'cors';
import { TodoService } from './domain/TodoService';
import { makeGetItems } from './routes/getItems';
import { makeAddItem } from './routes/addItem';
import { makeUpdateItem } from './routes/updateItem';
import { makeDeleteItem } from './routes/deleteItem';

export function createApp(todoService: TodoService) {
    const app = express();
    app.use(express.json());
    app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));

    app.get('/items', makeGetItems(todoService));
    app.post('/items', makeAddItem(todoService));
    app.put('/items/:id', makeUpdateItem(todoService));
    app.delete('/items/:id', makeDeleteItem(todoService));

    return app;
}