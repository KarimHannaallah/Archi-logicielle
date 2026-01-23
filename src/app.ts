import express from 'express';
import cors from 'cors';
import { makeGetItems } from './routes/getItems';
import { makeAddItem } from './routes/addItem';
import { makeUpdateItem } from './routes/updateItem';
import { makeDeleteItem } from './routes/deleteItem';
import * as persistence from './persistence/index';

export function createApp() {
    const app = express();
    app.use(express.json());
    app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));

    app.get('/items', makeGetItems(persistence));
    app.post('/items', makeAddItem(persistence));
    app.put('/items/:id', makeUpdateItem(persistence));
    app.delete('/items/:id', makeDeleteItem(persistence));

    return app;
}