/**
 * MySQL persistence tests for project-service.
 *
 * Skipped automatically if MYSQL_HOST is not set.
 * To run:
 *   docker compose --profile mysql up -d
 *   MYSQL_HOST=localhost MYSQL_PORT=3307 MYSQL_USER=todo MYSQL_PASSWORD=todopass MYSQL_DB=todos \
 *     npx jest spec/integration/mysql.spec.js
 */

const SKIP = !process.env.MYSQL_HOST;
const conditionalDescribe = SKIP ? describe.skip : describe;

const PROJECT = {
    id: '7aef3d7c-d301-4846-8358-2a91ec9d6be3',
    name: 'Test Project',
    userId: 'user-123',
    status: 'open',
    totalTasks: 0,
    completedTasks: 0,
    createdAt: new Date().toISOString(),
};

conditionalDescribe('MySQL persistence (ProjectRepository interface)', () => {
    let repo;

    beforeAll(async () => {
        const { createMysqlProjectRepository } = require('../../src/persistence/mysql');
        repo = createMysqlProjectRepository();
        await repo.init();
    }, 20_000);

    afterAll(async () => {
        try { await repo.teardown(); } catch (_e) {}
    });

    beforeEach(async () => {
        try { await repo.remove(PROJECT.id, PROJECT.userId); } catch (_e) {}
    });

    test('initializes correctly', async () => {
        const items = await repo.getAll(PROJECT.userId);
        expect(Array.isArray(items)).toBe(true);
    });

    test('can add and retrieve a project', async () => {
        await repo.add(PROJECT);
        const items = await repo.getAll(PROJECT.userId);
        const found = items.find(p => p.id === PROJECT.id);
        expect(found).toBeDefined();
        expect(found.name).toBe(PROJECT.name);
        expect(found.status).toBe('open');
    });

    test('can get a project by id', async () => {
        await repo.add(PROJECT);
        const found = await repo.getById(PROJECT.id, PROJECT.userId);
        expect(found).toBeDefined();
        expect(found.id).toBe(PROJECT.id);
    });

    test('getById returns undefined for non-existent id', async () => {
        const found = await repo.getById('non-existent', PROJECT.userId);
        expect(found).toBeUndefined();
    });

    test('can update a project', async () => {
        await repo.add(PROJECT);
        await repo.update(PROJECT.id, PROJECT.userId, { name: 'Updated', status: 'closed' });
        const found = await repo.getById(PROJECT.id, PROJECT.userId);
        expect(found.name).toBe('Updated');
        expect(found.status).toBe('closed');
    });

    test('can remove a project', async () => {
        await repo.add(PROJECT);
        await repo.remove(PROJECT.id, PROJECT.userId);
        const found = await repo.getById(PROJECT.id, PROJECT.userId);
        expect(found).toBeUndefined();
    });
});