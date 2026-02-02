const db = require('../../src/persistence/inmemory');

const ITEM = {
    id: '7aef3d7c-d301-4846-8358-2a91ec9d6be3',
    name: 'Test',
    completed: false,
};

beforeEach(async () => {
    await db.init(); // clears the store
});

afterAll(async () => {
    await db.teardown();
});

describe('InMemory persistence (TodoRepository interface)', () => {
    test('it initializes correctly', async () => {
        await db.init();
    });

    test('it can store and retrieve items', async () => {
        await db.add(ITEM);

        const items = await db.getAll();
        expect(items.length).toBe(1);
        expect(items[0]).toEqual(ITEM);
    });

    test('it can update an existing item', async () => {
        await db.add(ITEM);

        await db.update(ITEM.id, {
            name: ITEM.name,
            completed: !ITEM.completed,
        });

        const items = await db.getAll();
        expect(items.length).toBe(1);
        expect(items[0].completed).toBe(!ITEM.completed);
    });

    test('it can remove an existing item', async () => {
        await db.add(ITEM);

        await db.remove(ITEM.id);

        const items = await db.getAll();
        expect(items.length).toBe(0);
    });

    test('it can get a single item', async () => {
        await db.add(ITEM);

        const item = await db.getById(ITEM.id);
        expect(item).toEqual(ITEM);
    });

    test('getById returns undefined for non-existent id', async () => {
        const item = await db.getById('non-existent-id');
        expect(item).toBeUndefined();
    });

    test('getAll returns empty array when no items', async () => {
        const items = await db.getAll();
        expect(items).toEqual([]);
    });

    test('add creates a defensive copy', async () => {
        const mutable = { ...ITEM };
        await db.add(mutable);
        mutable.name = 'Mutated';

        const item = await db.getById(ITEM.id);
        expect(item.name).toBe('Test');
    });
});
