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
                'CREATE TABLE IF NOT EXISTS todo_items (id varchar(36), name varchar(255), completed boolean, user_id varchar(36), project_id varchar(36) DEFAULT "")',
                (err: Error | null) => {
                    if (err) return rej(err);
                    // Migration : ajouter la colonne si elle n'existe pas
                    db.run(
                        'ALTER TABLE todo_items ADD COLUMN project_id varchar(36) DEFAULT ""',
                        () => acc(), // ignore l'erreur si la colonne existe déjà
                    );
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

async function getAll(userId: string, projectId?: string): Promise<TodoItem[]> {
    return new Promise((acc, rej) => {
        let sql = 'SELECT * FROM todo_items WHERE user_id=?';
        const params: string[] = [userId];
        if (projectId) {
            sql += ' AND project_id=?';
            params.push(projectId);
        }
        db.all(sql, params, (err: Error | null, rows: any[]) => {
            if (err) return rej(err);
            acc(
                rows.map(row => ({
                    id: row.id,
                    name: row.name,
                    completed: row.completed === 1,
                    userId: row.user_id,
                    projectId: row.project_id || '',
                })),
            );
        });
    });
}

async function getById(id: string, userId: string): Promise<TodoItem | undefined> {
    return new Promise((acc, rej) => {
        db.all('SELECT * FROM todo_items WHERE id=? AND user_id=?', [id, userId], (err: Error | null, rows: any[]) => {
            if (err) return rej(err);
            acc(
                rows.map(row => ({
                    id: row.id,
                    name: row.name,
                    completed: row.completed === 1,
                    userId: row.user_id,
                    projectId: row.project_id || '',
                }))[0],
            );
        });
    });
}

async function add(item: TodoItem): Promise<void> {
    return new Promise((acc, rej) => {
        db.run(
            'INSERT INTO todo_items (id, name, completed, user_id, project_id) VALUES (?, ?, ?, ?, ?)',
            [item.id, item.name, item.completed ? 1 : 0, item.userId, item.projectId || ''],
            (err: Error | null) => {
                if (err) return rej(err);
                acc();
            },
        );
    });
}

async function update(id: string, userId: string, data: { name: string; completed: boolean }): Promise<void> {
    return new Promise((acc, rej) => {
        db.run(
            'UPDATE todo_items SET name=?, completed=? WHERE id=? AND user_id=?',
            [data.name, data.completed ? 1 : 0, id, userId],
            (err: Error | null) => {
                if (err) return rej(err);
                acc();
            },
        );
    });
}

async function remove(id: string, userId: string): Promise<void> {
    return new Promise((acc, rej) => {
        db.run('DELETE FROM todo_items WHERE id=? AND user_id=?', [id, userId], (err: Error | null) => {
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
