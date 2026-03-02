const request = require('supertest');
const { createTodoService } = require('../../src/domain/TodoService');
const { createAuthService } = require('../../src/domain/AuthService');
const { createApp } = require('../../src/app');
const { createInMemoryUserRepository } = require('../../src/persistence/userInmemory');

const repo = require('../../src/persistence/inmemory');
const userRepo = createInMemoryUserRepository();
const todoService = createTodoService(repo);
const authService = createAuthService(userRepo);
const app = createApp(todoService, { authService, enableAuth: true });

beforeAll(async () => {
    await repo.init();
    await userRepo.init();
});

beforeEach(async () => {
    const items = await repo.getAll();
    for (const item of items) {
        await repo.remove(item.id);
    }
    await userRepo.teardown();
    await userRepo.init();
});

afterAll(async () => {
    await repo.teardown();
    await userRepo.teardown();
});

describe('Auth API', () => {
    const testUser = {
        email: 'test@example.com',
        name: 'Test User',
        password: 'Password123!',
        consent: true,
    };

    describe('POST /auth/register', () => {
        test('registers a new user', async () => {
            const res = await request(app)
                .post('/auth/register')
                .send(testUser);

            expect(res.status).toBe(201);
            expect(res.body.token).toBeDefined();
            expect(res.body.user.email).toBe(testUser.email);
            expect(res.body.user.name).toBe(testUser.name);
            expect(res.body.user.passwordHash).toBeUndefined();
        });

        test('rejects duplicate email', async () => {
            await request(app).post('/auth/register').send(testUser);
            const res = await request(app).post('/auth/register').send(testUser);

            expect(res.status).toBe(409);
        });

        test('rejects without consent', async () => {
            const res = await request(app)
                .post('/auth/register')
                .send({ ...testUser, consent: false });

            expect(res.status).toBe(400);
        });

        test('rejects missing fields', async () => {
            const res = await request(app)
                .post('/auth/register')
                .send({ email: 'a@b.com' });

            expect(res.status).toBe(400);
        });
    });

    describe('POST /auth/login', () => {
        test('logs in with correct credentials', async () => {
            await request(app).post('/auth/register').send(testUser);

            const res = await request(app)
                .post('/auth/login')
                .send({ email: testUser.email, password: testUser.password });

            expect(res.status).toBe(200);
            expect(res.body.token).toBeDefined();
        });

        test('rejects wrong password', async () => {
            await request(app).post('/auth/register').send(testUser);

            const res = await request(app)
                .post('/auth/login')
                .send({ email: testUser.email, password: 'wrong' });

            expect(res.status).toBe(401);
        });

        test('rejects non-existent email', async () => {
            const res = await request(app)
                .post('/auth/login')
                .send({ email: 'no@user.com', password: 'whatever' });

            expect(res.status).toBe(401);
        });
    });

    describe('GET /auth/profile', () => {
        test('returns profile when authenticated', async () => {
            const reg = await request(app).post('/auth/register').send(testUser);

            const res = await request(app)
                .get('/auth/profile')
                .set('Authorization', `Bearer ${reg.body.token}`);

            expect(res.status).toBe(200);
            expect(res.body.email).toBe(testUser.email);
            expect(res.body.name).toBe(testUser.name);
            expect(res.body.passwordHash).toBeUndefined();
        });

        test('rejects without token', async () => {
            const res = await request(app).get('/auth/profile');
            expect(res.status).toBe(401);
        });
    });

    describe('PUT /auth/profile', () => {
        test('updates profile', async () => {
            const reg = await request(app).post('/auth/register').send(testUser);

            const res = await request(app)
                .put('/auth/profile')
                .set('Authorization', `Bearer ${reg.body.token}`)
                .send({ name: 'Updated Name', email: 'new@email.com' });

            expect(res.status).toBe(200);
            expect(res.body.name).toBe('Updated Name');
            expect(res.body.email).toBe('new@email.com');
        });
    });

    describe('DELETE /auth/profile (RGPD droit à l\'effacement)', () => {
        test('deletes account', async () => {
            const reg = await request(app).post('/auth/register').send(testUser);

            const res = await request(app)
                .delete('/auth/profile')
                .set('Authorization', `Bearer ${reg.body.token}`);

            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Account deleted successfully');
        });
    });

    describe('Protected routes', () => {
        test('/items requires authentication', async () => {
            const res = await request(app).get('/items');
            expect(res.status).toBe(401);
        });

        test('/items works with valid token', async () => {
            const reg = await request(app).post('/auth/register').send(testUser);

            const res = await request(app)
                .get('/items')
                .set('Authorization', `Bearer ${reg.body.token}`);

            expect(res.status).toBe(200);
            expect(res.body).toEqual([]);
        });
    });
});
