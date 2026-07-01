import path from 'path';
import { Pact, Matchers } from '@pact-foundation/pact';

const { like, term } = Matchers;

const uuidLike = () => term({
    generate: '00000000-0000-0000-0000-000000000001',
    matcher: '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}',
});

const provider = new Pact({
    consumer: 'frontend',
    provider: 'auth-service',
    dir: path.resolve(__dirname, '..'),
    logLevel: 'warn',
    port: 1234,
});

const BASE = 'http://localhost:1234';

beforeAll(() => provider.setup());
afterEach(() => provider.verify());
afterAll(() => provider.finalize());

describe('frontend → auth-service contract', () => {

    describe('POST /auth/register', () => {
        beforeEach(() =>
            provider.addInteraction({
                state: 'email alice@example.com is not taken',
                uponReceiving: 'register a new user',
                withRequest: {
                    method: 'POST',
                    path: '/auth/register',
                    headers: { 'Content-Type': 'application/json' },
                    body: {
                        email: 'alice@example.com',
                        name: 'Alice',
                        password: 'secret123',
                        consent: true,
                    },
                },
                willRespondWith: {
                    status: 201,
                    headers: { 'Content-Type': like('application/json') },
                    body: {
                        token: like('some-jwt-token'),
                        user: {
                            id: uuidLike(),
                            email: like('alice@example.com'),
                            name: like('Alice'),
                        },
                    },
                },
            })
        );

        it('returns token and user on successful registration', async () => {
            const res = await fetch(`${BASE}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: 'alice@example.com',
                    name: 'Alice',
                    password: 'secret123',
                    consent: true,
                }),
            });
            expect(res.status).toBe(201);
            const data = await res.json();
            expect(data.token).toBeDefined();
            expect(data.user.email).toBeDefined();
        });
    });

    describe('POST /auth/login', () => {
        beforeEach(() =>
            provider.addInteraction({
                state: 'user alice@example.com exists with password secret123',
                uponReceiving: 'login with valid credentials',
                withRequest: {
                    method: 'POST',
                    path: '/auth/login',
                    headers: { 'Content-Type': 'application/json' },
                    body: { email: 'alice@example.com', password: 'secret123' },
                },
                willRespondWith: {
                    status: 200,
                    headers: { 'Content-Type': like('application/json') },
                    body: {
                        token: like('some-jwt-token'),
                        user: {
                            id: uuidLike(),
                            email: like('alice@example.com'),
                            name: like('Alice'),
                        },
                    },
                },
            })
        );

        it('returns token and user on valid login', async () => {
            const res = await fetch(`${BASE}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: 'alice@example.com', password: 'secret123' }),
            });
            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data.token).toBeDefined();
            expect(data.user.id).toBeDefined();
        });
    });

    describe('GET /auth/verify', () => {
        beforeEach(() =>
            provider.addInteraction({
                state: 'user alice@example.com exists with a valid token',
                uponReceiving: 'verify a valid token',
                withRequest: {
                    method: 'GET',
                    path: '/auth/verify',
                    headers: { Authorization: like('Bearer valid-token') },
                },
                willRespondWith: {
                    status: 200,
                    headers: { 'Content-Type': like('application/json') },
                    body: {
                        valid: true,
                        userId: uuidLike(),
                    },
                },
            })
        );

        it('returns valid true and userId', async () => {
            const res = await fetch(`${BASE}/auth/verify`, {
                headers: { Authorization: 'Bearer valid-token' },
            });
            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data.valid).toBe(true);
            expect(data.userId).toBeDefined();
        });
    });

    describe('POST /auth/login wrong password', () => {
        beforeEach(() =>
            provider.addInteraction({
                state: 'user alice@example.com exists with password secret123',
                uponReceiving: 'login with wrong password',
                withRequest: {
                    method: 'POST',
                    path: '/auth/login',
                    headers: { 'Content-Type': 'application/json' },
                    body: { email: 'alice@example.com', password: 'wrong' },
                },
                willRespondWith: {
                    status: 401,
                    headers: { 'Content-Type': like('application/json') },
                    body: { error: like('Invalid credentials') },
                },
            })
        );

        it('returns 401 on wrong password', async () => {
            const res = await fetch(`${BASE}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: 'alice@example.com', password: 'wrong' }),
            });
            expect(res.status).toBe(401);
        });
    });
});