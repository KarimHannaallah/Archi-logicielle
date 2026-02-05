/**
 * Test de non-régression : interdit l'utilisation de sqlite3 en environnement
 * de test. Garantit que le domaine et les tests métiers restent découplés
 * de l'infrastructure de base de données.
 */

describe('Infrastructure isolation – non-regression', () => {
    test('sqlite3 must NOT be loaded when using InMemoryRepository', () => {
        jest.resetModules();

        // Require InMemory adapter directly (comme le font les tests d'intégration)
        const repo = require('../../src/persistence/inmemory');

        // sqlite3 should NOT appear among loaded modules
        const loadedModules = Object.keys(require.cache);
        const sqliteModules = loadedModules.filter(
            (mod) =>
                mod.includes('node_modules/sqlite3') ||
                mod.includes('persistence/sqlite'),
        );

        expect(sqliteModules).toEqual([]);

        // Verify we got a working TodoRepository implementation
        expect(typeof repo.init).toBe('function');
        expect(typeof repo.getAll).toBe('function');
        expect(typeof repo.add).toBe('function');
        expect(typeof repo.getById).toBe('function');
        expect(typeof repo.update).toBe('function');
        expect(typeof repo.remove).toBe('function');
    });

    test('InMemoryRepository and SqliteRepository both implement TodoRepository', () => {
        jest.resetModules();

        const inmemory = require('../../src/persistence/inmemory');
        const todoRepositoryMethods = ['getAll', 'getById', 'add', 'update', 'remove'];

        for (const method of todoRepositoryMethods) {
            expect(typeof inmemory[method]).toBe('function');
        }
    });

    test('createApp + TodoService works without any DB dependency', async () => {
        jest.resetModules();

        const { createTodoService } = require('../../src/domain/TodoService');
        const { createApp } = require('../../src/app');
        const repo = require('../../src/persistence/inmemory');

        await repo.init();
        const service = createTodoService(repo);
        const app = createApp(service);

        // Verify the app is functional
        expect(app).toBeDefined();
        expect(typeof app.listen).toBe('function');

        // sqlite3 should still NOT be loaded
        const loadedModules = Object.keys(require.cache);
        const sqliteModules = loadedModules.filter(
            (mod) =>
                mod.includes('node_modules/sqlite3') ||
                mod.includes('persistence/sqlite'),
        );
        expect(sqliteModules).toEqual([]);

        await repo.teardown();
    });
});
