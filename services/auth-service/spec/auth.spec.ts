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

const VALID_USER = {
    email: 'seif@example.com',
    name: 'Seif',
    password: 'secret123',
    consent: true,
};

// ─── Register ────────────────────────────────────────────────────────────────

describe('POST /auth/register', () => {
    it('crée un utilisateur et retourne un token', async () => {
        const app = buildApp();
        const res = await request(app).post('/auth/register').send(VALID_USER);

        expect(res.status).toBe(201);
        expect(res.body.token).toBeDefined();
        expect(res.body.user.email).toBe(VALID_USER.email);
        expect(res.body.user.name).toBe(VALID_USER.name);
        expect(res.body.user.passwordHash).toBeUndefined();
    });

    it('rejette un email déjà utilisé avec 409', async () => {
        const app = buildApp();
        await request(app).post('/auth/register').send(VALID_USER);
        const res = await request(app).post('/auth/register').send(VALID_USER);

        expect(res.status).toBe(409);
        expect(res.body.error).toBe('Email already in use');
    });

    it('rejette si email manquant avec 400', async () => {
        const app = buildApp();
        const res = await request(app)
            .post('/auth/register')
            .send({ name: 'Seif', password: 'secret123', consent: true });

        expect(res.status).toBe(400);
    });

    it('rejette si password manquant avec 400', async () => {
        const app = buildApp();
        const res = await request(app)
            .post('/auth/register')
            .send({ email: 'seif@example.com', name: 'Seif', consent: true });

        expect(res.status).toBe(400);
    });

    it('rejette si consent est false avec 400', async () => {
        const app = buildApp();
        const res = await request(app)
            .post('/auth/register')
            .send({ ...VALID_USER, consent: false });

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/consent/i);
    });

    it('rejette si consent est absent avec 400', async () => {
        const app = buildApp();
        const { consent: _, ...withoutConsent } = VALID_USER;
        const res = await request(app)
            .post('/auth/register')
            .send(withoutConsent);

        expect(res.status).toBe(400);
    });
});

// ─── Login ───────────────────────────────────────────────────────────────────

describe('POST /auth/login', () => {
    it('retourne un token pour des identifiants valides', async () => {
        const app = buildApp();
        await request(app).post('/auth/register').send(VALID_USER);
        const res = await request(app)
            .post('/auth/login')
            .send({ email: VALID_USER.email, password: VALID_USER.password });

        expect(res.status).toBe(200);
        expect(res.body.token).toBeDefined();
        expect(res.body.user.email).toBe(VALID_USER.email);
    });

    it('rejette un mauvais mot de passe avec 401', async () => {
        const app = buildApp();
        await request(app).post('/auth/register').send(VALID_USER);
        const res = await request(app)
            .post('/auth/login')
            .send({ email: VALID_USER.email, password: 'mauvais' });

        expect(res.status).toBe(401);
        expect(res.body.error).toBe('Invalid credentials');
    });

    it('rejette un email inconnu avec 401', async () => {
        const app = buildApp();
        const res = await request(app)
            .post('/auth/login')
            .send({ email: 'inconnu@example.com', password: 'secret123' });

        expect(res.status).toBe(401);
    });

    it('rejette si email manquant avec 400', async () => {
        const app = buildApp();
        const res = await request(app)
            .post('/auth/login')
            .send({ password: 'secret123' });

        expect(res.status).toBe(400);
    });

    it('rejette si password manquant avec 400', async () => {
        const app = buildApp();
        const res = await request(app)
            .post('/auth/login')
            .send({ email: VALID_USER.email });

        expect(res.status).toBe(400);
    });
});

// ─── Logout ──────────────────────────────────────────────────────────────────

describe('POST /auth/logout', () => {
    it('retourne un message de succès', async () => {
        const app = buildApp();
        const res = await request(app).post('/auth/logout');

        expect(res.status).toBe(200);
        expect(res.body.message).toBe('Logged out successfully');
    });
});

// ─── Profile GET ─────────────────────────────────────────────────────────────

describe('GET /auth/profile', () => {
    it('retourne le profil pour un utilisateur authentifié', async () => {
        const app = buildApp();
        const reg = await request(app).post('/auth/register').send(VALID_USER);
        const { token } = reg.body;

        const res = await request(app)
            .get('/auth/profile')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.email).toBe(VALID_USER.email);
        expect(res.body.name).toBe(VALID_USER.name);
        expect(res.body.passwordHash).toBeUndefined();
        expect(res.body.createdAt).toBeDefined();
        expect(res.body.consentGiven).toBe(true);
    });

    it('retourne 401 sans token', async () => {
        const app = buildApp();
        const res = await request(app).get('/auth/profile');

        expect(res.status).toBe(401);
    });

    it('retourne 401 avec un token invalide', async () => {
        const app = buildApp();
        const res = await request(app)
            .get('/auth/profile')
            .set('Authorization', 'Bearer tokenbidon');

        expect(res.status).toBe(401);
    });
});

// ─── Profile PUT ─────────────────────────────────────────────────────────────

describe('PUT /auth/profile', () => {
    it('met à jour le nom et l\'email', async () => {
        const app = buildApp();
        const reg = await request(app).post('/auth/register').send(VALID_USER);
        const { token } = reg.body;

        const res = await request(app)
            .put('/auth/profile')
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'Seif Updated', email: 'seif-new@example.com' });

        expect(res.status).toBe(200);
        expect(res.body.name).toBe('Seif Updated');
        expect(res.body.email).toBe('seif-new@example.com');
    });

    it('rejette si name manquant avec 400', async () => {
        const app = buildApp();
        const reg = await request(app).post('/auth/register').send(VALID_USER);
        const { token } = reg.body;

        const res = await request(app)
            .put('/auth/profile')
            .set('Authorization', `Bearer ${token}`)
            .send({ email: 'seif-new@example.com' });

        expect(res.status).toBe(400);
    });

    it('rejette un email déjà pris avec 409', async () => {
        const app = buildApp();
        await request(app)
            .post('/auth/register')
            .send({ ...VALID_USER, email: 'autre@example.com' });

        const reg = await request(app).post('/auth/register').send(VALID_USER);
        const { token } = reg.body;

        const res = await request(app)
            .put('/auth/profile')
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'Seif', email: 'autre@example.com' });

        expect(res.status).toBe(409);
    });

    it('retourne 401 sans token', async () => {
        const app = buildApp();
        const res = await request(app)
            .put('/auth/profile')
            .send({ name: 'X', email: 'x@x.com' });

        expect(res.status).toBe(401);
    });
});

// ─── Profile DELETE ───────────────────────────────────────────────────────────

describe('DELETE /auth/profile', () => {
    it('supprime le compte et rend le profil inaccessible', async () => {
        const app = buildApp();
        const reg = await request(app).post('/auth/register').send(VALID_USER);
        const { token } = reg.body;

        const del = await request(app)
            .delete('/auth/profile')
            .set('Authorization', `Bearer ${token}`);

        expect(del.status).toBe(200);
        expect(del.body.message).toBe('Account deleted successfully');

        const get = await request(app)
            .get('/auth/profile')
            .set('Authorization', `Bearer ${token}`);

        expect(get.status).toBe(404);
    });

    it('retourne 401 sans token', async () => {
        const app = buildApp();
        const res = await request(app).delete('/auth/profile');

        expect(res.status).toBe(401);
    });
});

// ─── Verify ──────────────────────────────────────────────────────────────────

describe('GET /auth/verify', () => {
    it('retourne valid:true et userId pour un token valide', async () => {
        const app = buildApp();
        const reg = await request(app).post('/auth/register').send(VALID_USER);
        const { token, user } = reg.body;

        const res = await request(app)
            .get('/auth/verify')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.valid).toBe(true);
        expect(res.body.userId).toBe(user.id);
    });

    it('retourne 401 pour un token falsifié', async () => {
        const app = buildApp();
        const res = await request(app)
            .get('/auth/verify')
            .set('Authorization', 'Bearer invalid.token.here');

        expect(res.status).toBe(401);
    });

    it('retourne 401 sans token', async () => {
        const app = buildApp();
        const res = await request(app).get('/auth/verify');

        expect(res.status).toBe(401);
    });
});

// ─── Health ──────────────────────────────────────────────────────────────────

describe('GET /health', () => {
    it('retourne status ok', async () => {
        const app = buildApp();
        const res = await request(app).get('/health');

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('ok');
        expect(res.body.service).toBe('auth-service');
    });
});