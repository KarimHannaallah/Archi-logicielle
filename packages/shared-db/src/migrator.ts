import fs from 'node:fs';
import path from 'node:path';

interface Db {
    run(sql: string, params: any[], callback: (err: Error | null) => void): void;
    all(sql: string, params: any[], callback: (err: Error | null, rows: any[]) => void): void;
}

export function wrapMysqlPool(pool: {
    query(sql: string, params: any[], cb: (err: Error | null, rows?: any[]) => void): void;
}): Db {
    return {
        run(sql, params, cb) {
            pool.query(sql, params, (err) => cb(err));
        },
        all(sql, params, cb) {
            pool.query(sql, params, (err, rows) => cb(err, rows as any[]));
        },
    };
}

function exec(db: Db, sql: string, params: any[] = []): Promise<void> {
    return new Promise((res, rej) =>
        db.run(sql, params, (e) => (e ? rej(e) : res())),
    );
}

export async function runMigrations(db: Db, migrationsDir: string): Promise<string[]> {
    await exec(db, 'CREATE TABLE IF NOT EXISTS schema_migrations (name VARCHAR(255) PRIMARY KEY, applied_at VARCHAR(255) NOT NULL)', []);

    const applied: string[] = await new Promise((res, rej) =>
        db.all(
            'SELECT name FROM schema_migrations ORDER BY name',
            [],
            (e, rows) => (e ? rej(e) : res(rows.map((r: any) => r.name))),
        ),
    );

    const files = fs
        .readdirSync(migrationsDir)
        .filter((f) => f.endsWith('.sql'))
        .sort((a, b) => a.localeCompare(b));

    const pending = files.filter((f) => !applied.includes(f));

    for (const file of pending) {
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
        for (const stmt of sql.split(';').map((s) => s.trim()).filter(Boolean)) {
            await exec(db, stmt, []);
        }
        await exec(
            db,
            'INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?)',
            [file, new Date().toISOString()],
        );
    }

    return pending;
}