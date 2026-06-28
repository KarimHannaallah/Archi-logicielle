import path from 'node:path';
import { runMigrations } from '@archi/shared-db';

const sqlite3 = require('sqlite3').verbose();

function openMemoryDb(): Promise<any> {
    return new Promise((res, rej) => {
        const db = new sqlite3.Database(':memory:', (err: Error | null) => {
            if (err) return rej(err);
            res(db);
        });
    });
}

function allRows(db: any, sql: string): Promise<any[]> {
    return new Promise((res, rej) => {
        db.all(sql, [], (err: Error | null, rows: any[]) => (err ? rej(err) : res(rows)));
    });
}

function closeDb(db: any): Promise<void> {
    return new Promise((res, rej) => db.close((e: Error | null) => (e ? rej(e) : res())));
}

describe('auth-service migrations', () => {
    let db: any;

    beforeEach(async () => {
        db = await openMemoryDb();
    });

    afterEach(async () => {
        await closeDb(db);
    });

    test('creates users table with correct columns', async () => {
        const applied = await runMigrations(db, path.join(__dirname, '..', 'migrations'));
        expect(applied.length).toBeGreaterThan(0);

        const info = await allRows(db, "PRAGMA table_info('users')");
        const columns = info.map((c: any) => c.name);
        expect(columns).toEqual(
            expect.arrayContaining(['id', 'email', 'name', 'password_hash', 'created_at', 'consent_given']),
        );
    });

    test('records applied migrations in schema_migrations', async () => {
        await runMigrations(db, path.join(__dirname, '..', 'migrations'));
        const rows = await allRows(db, 'SELECT name FROM schema_migrations');
        expect(rows.length).toBeGreaterThan(0);
        expect(rows[0].name).toBe('001_create_users.sql');
    });

    test('is idempotent — running twice applies nothing on second run', async () => {
        const migrationsDir = path.join(__dirname, '..', 'migrations');
        await runMigrations(db, migrationsDir);
        const second = await runMigrations(db, migrationsDir);
        expect(second).toEqual([]);
    });
});