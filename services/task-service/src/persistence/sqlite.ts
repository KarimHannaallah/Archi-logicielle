import fs from 'fs';
import path from 'path';
import type { TodoItem } from '../domain/TodoItem';

const sqlite3 = require('sqlite3').verbose();
const location = process.env.SQLITE_DB_LOCATION || '/etc/todos/todo.db';

let db: any;

function init(): Promise<void> {
    const dirName = path.dirname(location);
    if (!fs.existsSync(dirName)) {
        fs.mkdirSync(dirName, { recursive: true });
    }

    return new Promise((acc, rej) => {
        db = new sqlite3.Database(location, (err: Error | null) => {
            if (err) return rej(err);

            if (process.env.NODE_ENV !== 'test')
                console.log(`Using sqlite database at ${location}`);

            db.run(
                'CREATE TABLE IF NOT EXISTS todo_items (id varchar(36), name varchar(255), completed boolean, userId varchar(36), projectId varchar(36))',
                (err: Error | null) => {
                    if (err) return rej(err);
                    // Migration: add columns if they don't exist yet (for existing DBs)
                    db.run('ALTER TABLE todo_items ADD COLUMN userId varchar(36)', () => {});
                    db.run('ALTER TABLE todo_items ADD COLUMN projectId varchar(36)', () => {});
                    acc();
                },
            );
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

function mapRow(item: any): TodoItem {
    const mapped: any = {
        id: item.id,
        name: item.name,
        completed: item.completed === 1,
    };
    // Only include userId/projectId if they have a value (backward compat with toEqual in tests)
    if (item.userId != null) mapped.userId = item.userId;
    if (item.projectId != null) mapped.projectId = item.projectId;
    return mapped as TodoItem;
}

async function getAll(userId?: string, projectId?: string): Promise<TodoItem[]> {
    return new Promise((acc, rej) => {
        let sql = 'SELECT * FROM todo_items';
        const params: any[] = [];

        if (userId !== undefined && userId !== '') {
            sql += ' WHERE userId = ?';
            params.push(userId);
            if (projectId !== undefined) {
                sql += ' AND projectId = ?';
                params.push(projectId);
            }
        } else if (projectId !== undefined) {
            sql += ' WHERE projectId = ?';
            params.push(projectId);
        }

        db.all(sql, params, (err: Error | null, rows: any[]) => {
            if (err) return rej(err);
            acc(rows.map(mapRow));
        });
    });
}

async function getById(id: string): Promise<TodoItem | undefined> {
    return new Promise((acc, rej) => {
        db.all('SELECT * FROM todo_items WHERE id=?', [id], (err: Error | null, rows: any[]) => {
            if (err) return rej(err);
            acc(rows.map(mapRow)[0]);
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
