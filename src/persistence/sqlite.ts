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
                'CREATE TABLE IF NOT EXISTS todo_items (id varchar(36), name varchar(255), completed boolean)',
                (err: Error | null) => {
                    if (err) return rej(err);
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

async function getAll(): Promise<TodoItem[]> {
    return new Promise((acc, rej) => {
        db.all('SELECT * FROM todo_items', (err: Error | null, rows: any[]) => {
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
            'INSERT INTO todo_items (id, name, completed) VALUES (?, ?, ?)',
            [item.id, item.name, item.completed ? 1 : 0],
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
