const fs = require('fs');
const path = require('path');
const os = require('os');

// Use a temp file for tests so we don't depend on /etc/todos/
const testDbPath = path.join(
    os.tmpdir(),
    'todo-test-' + process.pid + '.db',
);
process.env.SQLITE_DB_LOCATION = testDbPath;

const db = require('../../src/persistence/sqlite');

const ITEM = {
    id: '7aef3d7c-d301-4846-8358-2a91ec9d6be3',
    name: 'Test',
    completed: false,
};

beforeEach(async () => {
    try {
        await db.teardown();
    } catch (_e) {
        // ignore – no connection open yet
    }
    if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
    }
});

afterAll(async () => {
    try {
        await db.teardown();
    } catch (_e) {
        // ignore
    }
    if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
    }
});

describe('SQLite persistence (TodoRepository interface)', () => {
    test('it initializes correctly', async () => {
        await db.init();
    });

    test('it can store and retrieve items', async () => {
        await db.init();

        await db.add(ITEM);

        const items = await db.getAll();
        expect(items.length).toBe(1);
        expect(items[0]).toEqual(ITEM);
    });

    test('it can update an existing item', async () => {
        await db.init();

        const initialItems = await db.getAll();
        expect(initialItems.length).toBe(0);

        await db.add(ITEM);

        await db.update(
            ITEM.id,
            Object.assign({}, ITEM, { completed: !ITEM.completed }),
        );

        const items = await db.getAll();
        expect(items.length).toBe(1);
        expect(items[0].completed).toBe(!ITEM.completed);
    });

    test('it can remove an existing item', async () => {
        await db.init();
        await db.add(ITEM);

        await db.remove(ITEM.id);

        const items = await db.getAll();
        expect(items.length).toBe(0);
    });

    test('it can get a single item', async () => {
        await db.init();
        await db.add(ITEM);

        const item = await db.getById(ITEM.id);
        expect(item).toEqual(ITEM);
    });

    test('getById returns undefined for non-existent id', async () => {
        await db.init();

        const item = await db.getById('non-existent-id');
        expect(item).toBeUndefined();
    });

    test('getAll returns empty array when no items', async () => {
        await db.init();

        const items = await db.getAll();
        expect(items).toEqual([]);
    });
});
