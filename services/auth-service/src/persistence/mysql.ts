import fs from 'fs';
import path from 'path';
import type { User } from '../domain/User';
import type { UserRepository } from '../domain/UserRepository';
import { runMigrations, wrapMysqlPool } from '@archi/shared-db';

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

export function createMysqlUserRepository(): UserRepository & { init(): Promise<void>; teardown(): Promise<void> } {
    let pool: any;

    return {
        async init(): Promise<void> {
            const host = getSecret(HOST, HOST_FILE);
            const user = getSecret(USER, USER_FILE);
            const password = getSecret(PASSWORD, PASSWORD_FILE);
            const database = getSecret(DB, DB_FILE);
            const port = Number.parseInt(process.env.MYSQL_PORT || '3306');

            await waitPort({ host, port, timeout: 10000, output: 'silent' });

            pool = mysql.createPool({ connectionLimit: 5, host, user, password, database, port });

            const migrationsDir = path.join(__dirname, '..', '..', 'migrations');
            await runMigrations(wrapMysqlPool(pool), migrationsDir);
            console.log(`[auth-service] Connected to mysql db at host ${host}`);
        },

        async teardown(): Promise<void> {
            return new Promise((acc, rej) => {
                pool.end((err: Error | null) => (err ? rej(err) : acc()));
            });
        },

        async findById(id: string): Promise<User | undefined> {
            return new Promise((acc, rej) => {
                pool.query('SELECT * FROM users WHERE id = ?', [id], (err: Error | null, rows: any[]) => {
                    if (err) return rej(err);
                    acc(rows.length ? mapRow(rows[0]) : undefined);
                });
            });
        },

        async findByEmail(email: string): Promise<User | undefined> {
            return new Promise((acc, rej) => {
                pool.query('SELECT * FROM users WHERE email = ?', [email], (err: Error | null, rows: any[]) => {
                    if (err) return rej(err);
                    acc(rows.length ? mapRow(rows[0]) : undefined);
                });
            });
        },

        async create(user: User): Promise<void> {
            return new Promise((acc, rej) => {
                pool.query(
                    'INSERT INTO users (id, email, name, password_hash, created_at, consent_given) VALUES (?, ?, ?, ?, ?, ?)',
                    [user.id, user.email, user.name, user.passwordHash, user.createdAt, user.consentGiven ? 1 : 0],
                    (err: Error | null) => (err ? rej(err) : acc()),
                );
            });
        },

        async update(id: string, data: { name: string; email: string }): Promise<void> {
            return new Promise((acc, rej) => {
                pool.query(
                    'UPDATE users SET name = ?, email = ? WHERE id = ?',
                    [data.name, data.email, id],
                    (err: Error | null) => (err ? rej(err) : acc()),
                );
            });
        },

        async remove(id: string): Promise<void> {
            return new Promise((acc, rej) => {
                pool.query('DELETE FROM users WHERE id = ?', [id], (err: Error | null) => (err ? rej(err) : acc()));
            });
        },
    };
}

function mapRow(row: any): User {
    return {
        id: row.id,
        email: row.email,
        name: row.name,
        passwordHash: row.password_hash,
        createdAt: row.created_at,
        consentGiven: row.consent_given === 1,
    };
}