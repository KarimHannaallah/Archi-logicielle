const request = require('supertest');
const { createTodoService } = require('../../src/domain/TodoService');
const { createApp } = require('../../src/app');

// Wiring : InMemoryRepository → TodoService → App (sans auth pour les tests)
const repo = require('../../src/persistence/inmemory');
const todoService = createTodoService(repo);
const app = createApp(todoService);

beforeAll(async () => {
    await repo.init();
});

beforeEach(async () => {
    // Clear all items between tests
    const items = await repo.getAll();
    for (const item of items) {
        await repo.remove(item.id);
    }
});

afterAll(async () => {
    await repo.teardown();
});

describe('API Integration Tests', () => {
    describe('GET /items', () => {
        test('returns empty array when no items', async () => {
            const res = await request(app).get('/items');

            expect(res.status).toBe(200);
            expect(res.body).toEqual([]);
        });

        test('returns all items', async () => {
            await request(app)
                .post('/items')
                .send({ name: 'Item 1' });
            await request(app)
                .post('/items')
                .send({ name: 'Item 2' });

            const res = await request(app).get('/items');

            expect(res.status).toBe(200);
            expect(res.body.length).toBe(2);
            expect(res.body[0].name).toBe('Item 1');
            expect(res.body[1].name).toBe('Item 2');
        });
    });

    describe('POST /items', () => {
        test('creates a new item', async () => {
            const res = await request(app)
                .post('/items')
                .send({ name: 'Buy groceries' });

            expect(res.status).toBe(200);
            expect(res.body.name).toBe('Buy groceries');
            expect(res.body.completed).toBe(false);
            expect(res.body.id).toBeDefined();
        });

        test('created item is persisted', async () => {
            await request(app)
                .post('/items')
                .send({ name: 'Persisted item' });

            const res = await request(app).get('/items');

            expect(res.body.length).toBe(1);
            expect(res.body[0].name).toBe('Persisted item');
        });

        test('each item gets a unique id', async () => {
            const res1 = await request(app)
                .post('/items')
                .send({ name: 'Item A' });
            const res2 = await request(app)
                .post('/items')
                .send({ name: 'Item B' });

            expect(res1.body.id).not.toBe(res2.body.id);
        });
    });

    describe('PUT /items/:id', () => {
        test('updates an existing item', async () => {
            const created = await request(app)
                .post('/items')
                .send({ name: 'Original' });

            const res = await request(app)
                .put(`/items/${created.body.id}`)
                .send({ name: 'Updated', completed: true });

            expect(res.status).toBe(200);
            expect(res.body.name).toBe('Updated');
            expect(res.body.completed).toBe(true);
        });

        test('update is persisted', async () => {
            const created = await request(app)
                .post('/items')
                .send({ name: 'Before' });

            await request(app)
                .put(`/items/${created.body.id}`)
                .send({ name: 'After', completed: true });

            const res = await request(app).get('/items');

            expect(res.body.length).toBe(1);
            expect(res.body[0].name).toBe('After');
            expect(res.body[0].completed).toBe(true);
        });

        test('toggling completed back to false works', async () => {
            const created = await request(app)
                .post('/items')
                .send({ name: 'Toggle me' });

            await request(app)
                .put(`/items/${created.body.id}`)
                .send({ name: 'Toggle me', completed: true });

            const res = await request(app)
                .put(`/items/${created.body.id}`)
                .send({ name: 'Toggle me', completed: false });

            expect(res.body.completed).toBe(false);
        });
    });

    describe('DELETE /items/:id', () => {
        test('deletes an existing item', async () => {
            const created = await request(app)
                .post('/items')
                .send({ name: 'To delete' });

            const res = await request(app).delete(
                `/items/${created.body.id}`,
            );

            expect(res.status).toBe(200);
        });

        test('deleted item is no longer returned', async () => {
            const created = await request(app)
                .post('/items')
                .send({ name: 'Will vanish' });

            await request(app).delete(`/items/${created.body.id}`);

            const res = await request(app).get('/items');
            expect(res.body.length).toBe(0);
        });

        test('deleting one item does not affect others', async () => {
            await request(app)
                .post('/items')
                .send({ name: 'Keep me' });
            const item2 = await request(app)
                .post('/items')
                .send({ name: 'Delete me' });

            await request(app).delete(`/items/${item2.body.id}`);

            const res = await request(app).get('/items');
            expect(res.body.length).toBe(1);
            expect(res.body[0].name).toBe('Keep me');
        });
    });

    describe('Full CRUD cycle', () => {
        test('create → read → update → read → delete → read', async () => {
            // Create
            const created = await request(app)
                .post('/items')
                .send({ name: 'Full cycle' });
            expect(created.body.name).toBe('Full cycle');
            expect(created.body.completed).toBe(false);

            // Read
            let items = await request(app).get('/items');
            expect(items.body.length).toBe(1);

            // Update
            await request(app)
                .put(`/items/${created.body.id}`)
                .send({ name: 'Full cycle - done', completed: true });

            // Read after update
            items = await request(app).get('/items');
            expect(items.body[0].name).toBe('Full cycle - done');
            expect(items.body[0].completed).toBe(true);

            // Delete
            await request(app).delete(`/items/${created.body.id}`);

            // Read after delete
            items = await request(app).get('/items');
            expect(items.body.length).toBe(0);
        });
    });
});
