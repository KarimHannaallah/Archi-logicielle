const request = require('supertest');

jest.mock('@archi/shared-auth', () => ({
    authMiddleware: (_req, _res, next) => next(),
}));

const { createProjectService } = require('../../src/domain/ProjectService');
const { createInMemoryProjectRepository, clearStore } = require('../../src/persistence/inmemory');
const { createApp } = require('../../src/app');

const repo = createInMemoryProjectRepository();
const projectService = createProjectService(repo);
const app = createApp(projectService);

beforeEach(() => clearStore());

describe('App — avec auth et rate limiting activés', () => {
    test('GET /projects retourne 200', async () => {
        const res = await request(app).get('/projects');
        expect(res.status).toBe(200);
    });

    test('POST /projects crée un projet', async () => {
        const res = await request(app)
            .post('/projects')
            .send({ name: 'Auth Project' });
        expect([200, 201]).toContain(res.status);
    });

    test('PUT /projects/:id met à jour un projet', async () => {
        const created = await request(app)
            .post('/projects')
            .send({ name: 'Original' });
        const res = await request(app)
            .put(`/projects/${created.body.id}`)
            .send({ name: 'Updated' });
        expect(res.status).toBe(200);
    });

    test('DELETE /projects/:id supprime un projet', async () => {
        const created = await request(app)
            .post('/projects')
            .send({ name: 'To delete' });
        const res = await request(app)
            .delete(`/projects/${created.body.id}`);
        expect(res.status).toBe(200);
    });

    test('GET /projects/:id retourne un projet', async () => {
        const created = await request(app)
            .post('/projects')
            .send({ name: 'Get by id' });
        const res = await request(app)
            .get(`/projects/${created.body.id}`);
        expect(res.status).toBe(200);
    });
});