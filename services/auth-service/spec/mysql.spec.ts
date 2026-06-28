/**
 * MySQL persistence tests for auth-service.
 *
 * Skipped automatically if MYSQL_HOST is not set.
 * To run:
 *   docker compose --profile mysql up -d
 *   MYSQL_HOST=localhost MYSQL_PORT=3307 MYSQL_USER=todo MYSQL_PASSWORD=todopass MYSQL_DB=todos \
 *     npx jest spec/mysql.spec.ts
 */

const SKIP = !process.env.MYSQL_HOST;
const conditionalDescribe = SKIP ? describe.skip : describe;

const USER = {
    id: '7aef3d7c-d301-4846-8358-2a91ec9d6be3',
    email: 'test@example.com',
    name: 'Test User',
    passwordHash: '$2b$10$hashedpassword',
    createdAt: new Date().toISOString(),
    consentGiven: true,
};

conditionalDescribe('MySQL persistence (UserRepository interface)', () => {
    let repo: any;

    beforeAll(async () => {
        const { createMysqlUserRepository } = require('../src/persistence/mysql');
        repo = createMysqlUserRepository();
        await repo.init();
    }, 20_000);

    afterAll(async () => {
        try { await repo.teardown(); } catch (_e) {}
    });

    beforeEach(async () => {
        try { await repo.remove(USER.id); } catch (_e) {}
    });

    test('initializes correctly', async () => {
        const found = await repo.findById('non-existent');
        expect(found).toBeUndefined();
    });

    test('can create and find a user by id', async () => {
        await repo.create(USER);
        const found = await repo.findById(USER.id);
        expect(found).toBeDefined();
        expect(found.email).toBe(USER.email);
        expect(found.name).toBe(USER.name);
        expect(found.consentGiven).toBe(true);
    });

    test('can find a user by email', async () => {
        await repo.create(USER);
        const found = await repo.findByEmail(USER.email);
        expect(found).toBeDefined();
        expect(found.id).toBe(USER.id);
    });

    test('findByEmail returns undefined for non-existent email', async () => {
        const found = await repo.findByEmail('nonexistent@example.com');
        expect(found).toBeUndefined();
    });

    test('can update a user', async () => {
        await repo.create(USER);
        await repo.update(USER.id, { name: 'Updated Name', email: 'updated@example.com' });
        const found = await repo.findById(USER.id);
        expect(found.name).toBe('Updated Name');
        expect(found.email).toBe('updated@example.com');
    });

    test('can remove a user', async () => {
        await repo.create(USER);
        await repo.remove(USER.id);
        const found = await repo.findById(USER.id);
        expect(found).toBeUndefined();
    });
});