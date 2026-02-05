const request = require('supertest');
const { InMemoryRepository } = require('../../src/persistence/inmemory');
const { createTodoService } = require('../../src/domain/TodoService');
const { createApp } = require('../../src/app');

// Le test construit son propre wiring — c'est ça la puissance de la DI
const repo = new InMemoryRepository();
const todoService = createTodoService(repo);
const app = createApp(todoService);

describe('Todo API — intégration', () => {
    let itemId;

    test('GET /items returns empty list', async () => {
        const res = await request(app).get('/items');
        expect(res.status).toBe(200);
        expect(res.body).toEqual([]);
    });

    test('POST /items creates an item', async () => {
        const res = await request(app).post('/items').send({ name: 'Buy milk' });
        expect(res.status).toBe(200);
        expect(res.body.name).toBe('Buy milk');
        expect(res.body.completed).toBe(false);
        itemId = res.body.id;
    });

    test('GET /items returns the created item', async () => {
        const res = await request(app).get('/items');
        expect(res.body).toHaveLength(1);
        expect(res.body[0].name).toBe('Buy milk');
    });

    test('PUT /items/:id updates an item', async () => {
        await request(app)
            .put(`/items/${itemId}`)
            .send({ name: 'Buy milk', completed: true });
        const res = await request(app).get('/items');
        expect(res.body[0].completed).toBe(true);
    });

    test('DELETE /items/:id removes an item', async () => {
        await request(app).delete(`/items/${itemId}`);
        const res = await request(app).get('/items');
        expect(res.body).toEqual([]);
    });
});