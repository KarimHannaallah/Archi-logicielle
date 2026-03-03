const request = require('supertest');
const { createProjectService } = require('../../src/domain/ProjectService');
const { createInMemoryProjectRepository, clearStore } = require('../../src/persistence/inmemory');
const { createApp } = require('../../src/app');

// Wiring : InMemoryProjectRepository → ProjectService → App (sans auth pour les tests)
const repo = createInMemoryProjectRepository();
const projectService = createProjectService(repo);
const app = createApp(projectService, { enableAuth: false });

const TEST_USER = 'user-test-001';

// Inject a fake userId for tests (auth is disabled but routes still read req.userId)
const originalGet = app.get.bind(app);

beforeEach(async () => {
    clearStore();
});

describe('Project Service — API Integration Tests', () => {
    describe('GET /projects', () => {
        test('returns empty array when no projects', async () => {
            const res = await request(app)
                .get('/projects')
                .set('x-user-id', TEST_USER);

            expect(res.status).toBe(200);
            expect(res.body).toEqual([]);
        });
    });

    describe('POST /projects', () => {
        test('creates a new project', async () => {
            const res = await request(app)
                .post('/projects')
                .send({ name: 'Mon projet' });

            expect(res.status).toBe(200);
            expect(res.body.name).toBe('Mon projet');
            expect(res.body.status).toBe('open');
            expect(res.body.completedTasks).toBe(0);
            expect(res.body.totalTasks).toBe(0);
            expect(res.body.id).toBeDefined();
        });

        test('each project gets a unique id', async () => {
            const res1 = await request(app)
                .post('/projects')
                .send({ name: 'Project A' });
            const res2 = await request(app)
                .post('/projects')
                .send({ name: 'Project B' });

            expect(res1.body.id).not.toBe(res2.body.id);
        });
    });

    describe('PUT /projects/:id', () => {
        test('updates a project name', async () => {
            const created = await request(app)
                .post('/projects')
                .send({ name: 'Original' });

            const res = await request(app)
                .put(`/projects/${created.body.id}`)
                .send({ name: 'Updated' });

            expect(res.status).toBe(200);
            expect(res.body.name).toBe('Updated');
        });
    });

    describe('DELETE /projects/:id', () => {
        test('deletes a project', async () => {
            const created = await request(app)
                .post('/projects')
                .send({ name: 'To delete' });

            const res = await request(app)
                .delete(`/projects/${created.body.id}`);

            expect(res.status).toBe(200);
        });

        test('deleted project is no longer returned', async () => {
            const created = await request(app)
                .post('/projects')
                .send({ name: 'Will vanish' });

            await request(app).delete(`/projects/${created.body.id}`);

            // Project was scoped to userId '' (no auth), so getAll('') should be empty
            const all = await repo.getAll('');
            expect(all.length).toBe(0);
        });
    });

    describe('Domain — incrementCompletedTasks auto-close', () => {
        test('project auto-closes when all tasks are completed', async () => {
            const created = await request(app)
                .post('/projects')
                .send({ name: 'Auto-close project' });

            const projectId = created.body.id;
            const userId = created.body.userId;

            // Simulate 1 task in the project
            await repo.update(projectId, userId, { totalTasks: 1 });

            // Increment completedTasks → should trigger auto-close
            await projectService.incrementCompletedTasks(projectId, userId);

            const project = await repo.getById(projectId, userId);
            expect(project.status).toBe('closed');
            expect(project.completedTasks).toBe(1);
        });

        test('project re-opens when a task is reopened', async () => {
            const created = await request(app)
                .post('/projects')
                .send({ name: 'Reopen project' });

            const projectId = created.body.id;
            const userId = created.body.userId;

            await repo.update(projectId, userId, { totalTasks: 1, completedTasks: 1, status: 'closed' });
            await projectService.decrementCompletedTasks(projectId, userId);

            const project = await repo.getById(projectId, userId);
            expect(project.status).toBe('open');
            expect(project.completedTasks).toBe(0);
        });
    });

    describe('Full CRUD cycle', () => {
        test('create → read → update → delete', async () => {
            const created = await request(app)
                .post('/projects')
                .send({ name: 'Full cycle' });

            expect(created.body.name).toBe('Full cycle');

            const updated = await request(app)
                .put(`/projects/${created.body.id}`)
                .send({ name: 'Full cycle - done' });

            expect(updated.body.name).toBe('Full cycle - done');

            const deleted = await request(app)
                .delete(`/projects/${created.body.id}`);

            expect(deleted.status).toBe(200);
        });
    });
});
