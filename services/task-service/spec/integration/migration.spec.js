const path = require('path');
const { runMigrations } = require('../../src/persistence/migrator');

const sqlite3 = require('sqlite3').verbose();

function openMemoryDb() {
    return new Promise((res, rej) => {
        const db = new sqlite3.Database(':memory:', (err) => {
            if (err) return rej(err);
            res(db);
        });
    });
}

function allRows(db, sql) {
    return new Promise((res, rej) => {
        db.all(sql, [], (err, rows) => (err ? rej(err) : res(rows)));
    });
}

function closeDb(db) {
    return new Promise((res, rej) => db.close((e) => (e ? rej(e) : res())));
}

describe('task-service migrations', () => {
    let db;

    beforeEach(async () => {
        db = await openMemoryDb();
    });

    afterEach(async () => {
        await closeDb(db);
    });

    test('creates todo_items table with correct columns', async () => {
        const applied = await runMigrations(db, path.join(__dirname, '..', '..', 'migrations'));
        expect(applied.length).toBeGreaterThan(0);

        const info = await allRows(db, "PRAGMA table_info('todo_items')");
        const columns = info.map((c) => c.name);
        expect(columns).toEqual(
            expect.arrayContaining(['id', 'name', 'completed', 'userId', 'projectId']),
        );
    });

    test('is idempotent — running twice applies nothing on second run', async () => {
        const dir = path.join(__dirname, '..', '..', 'migrations');
        await runMigrations(db, dir);
        const second = await runMigrations(db, dir);
        expect(second).toEqual([]);
    });
});