import fs from 'fs';
import type { TodoItem } from '../domain/TodoItem';

const mysql = require('mysql2');
const waitPort = require('wait-port');

const {
    MYSQL_HOST: HOST,
    MYSQL_HOST_FILE: HOST_FILE,
    MYSQL_USER: USER,
    MYSQL_USER_FILE: USER_FILE,
    MYSQL_PASSWORD: PASSWORD,
    MYSQL_PASSWORD_FILE: PASSWORD_FILE,
    MYSQL_DB: DB,
    MYSQL_DB_FILE: DB_FILE,
} = process.env;

function getSecret(secret: string | undefined, file: string | undefined): string {
    if (secret) return secret;
    if (file) return fs.readFileSync(file, 'utf8').trim();
    return '';
}

let pool: any;

async function init(): Promise<void> {
    const host = getSecret(HOST, HOST_FILE);
    const user = getSecret(USER, USER_FILE);
    const password = getSecret(PASSWORD, PASSWORD_FILE);
    const database = getSecret(DB, DB_FILE);

    await waitPort({ host, port: 3306, timeout: 10000, output: 'silent' });

    pool = mysql.createPool({
        connectionLimit: 5,
        host,
        user,
        password,
        database,
    });

    return new Promise((acc, rej) => {
        pool.query(
            'CREATE TABLE IF NOT EXISTS todo_items (id varchar(36), name varchar(255), completed boolean)',
            (err: Error | null) => {
                if (err) return rej(err);
                console.log(`Connected to mysql db at host ${host}`);
                acc();
            },
        );
    });
}

async function teardown(): Promise<void> {
    return new Promise((acc, rej) => {
        pool.end((err: Error | null) => {
            if (err) rej(err);
            else acc();
        });
    });
}

async function getAll(): Promise<TodoItem[]> {
    return new Promise((acc, rej) => {
        pool.query('SELECT * FROM todo_items', (err: Error | null, rows: any[]) => {
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
        pool.query('SELECT * FROM todo_items WHERE id=?', [id], (err: Error | null, rows: any[]) => {
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
        pool.query(
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
        pool.query(
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
        pool.query('DELETE FROM todo_items WHERE id = ?', [id], (err: Error | null) => {
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
