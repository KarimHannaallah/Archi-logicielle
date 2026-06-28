import fs from 'fs';
import path from 'path';
import type { TodoItem } from '../domain/TodoItem';
import { runMigrations } from '@archi/shared-db';

const sqlite3 = require('sqlite3').verbose();

const location = process.env.SQLITE_DB_LOCATION || '/tmp/todo.db';

let db: any;

async function init(): Promise<void> {
    const dirName = path.dirname(location);
    if (!fs.existsSync(dirName)) {
        fs.mkdirSync(dirName, { recursive: true });
    }

    return new Promise((acc, rej) => {
        db = new sqlite3.Database(location, (err: Error | null) => {
            if (err) return rej(err);

            if (process.env.NODE_ENV !== 'test') {
                console.log(`Using sqlite database at ${location}`);
            }

            const migrationsDir = path.join(__dirname, '..', '..', 'migrations');
            runMigrations(db, migrationsDir).then(() => acc()).catch(rej);
        });
    });
}

async function teardown(): Promise<void> {
    return new Promise((acc, rej) => {
        db.close((err: Error | null) => {
            if (err) rej(err);
            else acc();
        });
    });
}

async function getAll(userId?: string, projectId?: string): Promise<TodoItem[]> {
    return new Promise((acc, rej) => {
        let query = 'SELECT * FROM todo_items WHERE 1=1';
        const params: any[] = [];
        if (userId) {
            query += ' AND userId=?';
            params.push(userId);
        }
        if (projectId) {
            query += ' AND projectId=?';
            params.push(projectId);
        }
        db.all(query, params, (err: Error | null, rows: any[]) => {
            if (err) return rej(err);
            acc(
                rows.map(item =>
                    Object.assign({}, item, {
                        completed: item.completed === 1,
                    }),
                ),
            );
        });
    });
}

async function getById(id: string): Promise<TodoItem | undefined> {
    return new Promise((acc, rej) => {
        db.all('SELECT * FROM todo_items WHERE id=?', [id], (err: Error | null, rows: any[]) => {
            if (err) return rej(err);
            acc(
                rows.map(item =>
                    Object.assign({}, item, {
                        completed: item.completed === 1,
                    }),
                )[0],
            );
        });
    });
}

async function add(item: TodoItem): Promise<void> {
    return new Promise((acc, rej) => {
        db.run(
            'INSERT INTO todo_items (id, name, completed, userId, projectId) VALUES (?, ?, ?, ?, ?)',
            [item.id, item.name, item.completed ? 1 : 0, item.userId || null, item.projectId || null],
            (err: Error | null) => {
                if (err) return rej(err);
                acc();
            },
        );
    });
}

async function update(id: string, data: { name: string; completed: boolean }): Promise<void> {
    return new Promise((acc, rej) => {
        db.run(
            'UPDATE todo_items SET name=?, completed=? WHERE id = ?',
            [data.name, data.completed ? 1 : 0, id],
            (err: Error | null) => {
                if (err) return rej(err);
                acc();
            },
        );
    });
}

async function remove(id: string): Promise<void> {
    return new Promise((acc, rej) => {
        db.run('DELETE FROM todo_items WHERE id = ?', [id], (err: Error | null) => {
            if (err) return rej(err);
            acc();
        });
    });
}

const adapter = {
    init,
    teardown,
    getAll,
    getById,
    add,
    update,
    remove,
};

export = adapter;