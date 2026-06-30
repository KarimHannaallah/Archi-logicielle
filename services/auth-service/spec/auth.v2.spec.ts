import request from 'supertest';
import { createApp } from '../src/app';
import { createAuthService } from '../src/domain/AuthService';
import { createInMemoryUserRepository } from '../src/persistence/inmemory';

function buildApp() {
    const repo = createInMemoryUserRepository();
    repo.init();
    const authService = createAuthService(repo);
    return createApp(authService);
}

const VALID_V2_USER = {
    email: 'alice@example.com',
    name: 'Alice',
    password: 'secret123',
    consent: true,
    birthDate: '1999-05-15',
};

describe('POST /v2/auth/register', () => {
    it('crée un utilisateur avec birthDate et retourne un token', async () => {
        const app = buildApp();
        const res = await request(app).post('/v2/auth/register').send(VALID_V2_USER);

        expect(res.status).toBe(201);
        expect(res.body.token).toBeDefined();
        expect(res.body.user.email).toBe(VALID_V2_USER.email);
        expect(res.body.user.birthDate).toBe(VALID_V2_USER.birthDate);
        expect(res.body.user.passwordHash).toBeUndefined();
    });

    it('rejette si birthDate manquant avec 400', async () => {
        const app = buildApp();
        const { birthDate: _, ...withoutBirthDate } = VALID_V2_USER;
        const res = await request(app).post('/v2/auth/register').send(withoutBirthDate);

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/birthDate/i);
    });

    it('rejette si birthDate invalide avec 400', async () => {
        const app = buildApp();
        const res = await request(app)
            .post('/v2/auth/register')
            .send({ ...VALID_V2_USER, birthDate: 'not-a-date' });

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/birthDate/i);
    });

    it('rejette un email déjà utilisé avec 409', async () => {
        const app = buildApp();
        await request(app).post('/v2/auth/register').send(VALID_V2_USER);
        const res = await request(app).post('/v2/auth/register').send(VALID_V2_USER);

        expect(res.status).toBe(409);
    });

    it('rejette si email manquant avec 400', async () => {
        const app = buildApp();
        const { email: _, ...noEmail } = VALID_V2_USER;
        const res = await request(app).post('/v2/auth/register').send(noEmail);

        expect(res.status).toBe(400);
    });

    it('rejette si password manquant avec 400', async () => {
        const app = buildApp();
        const { password: _, ...noPassword } = VALID_V2_USER;
        const res = await request(app).post('/v2/auth/register').send(noPassword);

        expect(res.status).toBe(400);
    });
});