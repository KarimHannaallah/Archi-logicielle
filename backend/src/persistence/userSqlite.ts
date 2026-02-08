import fs from 'fs';
import path from 'path';
import type { User } from '../domain/User';
import type { UserRepository } from '../domain/UserRepository';

const sqlite3 = require('sqlite3').verbose();

export function createSqliteUserRepository(dbLocation?: string): UserRepository & { init(): Promise<void>; teardown(): Promise<void> } {
    const location = dbLocation || process.env.SQLITE_DB_LOCATION || '/etc/todos/todo.db';
    let db: any;

    return {
        init(): Promise<void> {
            const dirName = path.dirname(location);
            if (!fs.existsSync(dirName)) {
                fs.mkdirSync(dirName, { recursive: true });
            }

            return new Promise((acc, rej) => {
                db = new sqlite3.Database(location, (err: Error | null) => {
                    if (err) return rej(err);

                    db.run(
                        `CREATE TABLE IF NOT EXISTS users (
                            id VARCHAR(36) PRIMARY KEY,
                            email VARCHAR(255) UNIQUE NOT NULL,
                            name VARCHAR(255) NOT NULL,
                            password_hash TEXT NOT NULL,
                            created_at TEXT NOT NULL,
                            consent_given BOOLEAN DEFAULT 0
                        )`,
                        (err: Error | null) => {
                            if (err) return rej(err);
                            acc();
                        },
                    );
                });
            });
        },

        async teardown(): Promise<void> {
            return new Promise((acc, rej) => {
                db.close((err: Error | null) => {
                    if (err) rej(err);
                    else acc();
                });
            });
        },

        async findById(id: string): Promise<User | undefined> {
            return new Promise((acc, rej) => {
                db.get('SELECT * FROM users WHERE id = ?', [id], (err: Error | null, row: any) => {
                    if (err) return rej(err);
                    if (!row) return acc(undefined);
                    acc({
                        id: row.id,
                        email: row.email,
                        name: row.name,
                        passwordHash: row.password_hash,
                        createdAt: row.created_at,
                        consentGiven: row.consent_given === 1,
                    });
                });
            });
        },

        async findByEmail(email: string): Promise<User | undefined> {
            return new Promise((acc, rej) => {
                db.get('SELECT * FROM users WHERE email = ?', [email], (err: Error | null, row: any) => {
                    if (err) return rej(err);
                    if (!row) return acc(undefined);
                    acc({
                        id: row.id,
                        email: row.email,
                        name: row.name,
                        passwordHash: row.password_hash,
                        createdAt: row.created_at,
                        consentGiven: row.consent_given === 1,
                    });
                });
            });
        },

        async create(user: User): Promise<void> {
            return new Promise((acc, rej) => {
                db.run(
                    'INSERT INTO users (id, email, name, password_hash, created_at, consent_given) VALUES (?, ?, ?, ?, ?, ?)',
                    [user.id, user.email, user.name, user.passwordHash, user.createdAt, user.consentGiven ? 1 : 0],
                    (err: Error | null) => {
                        if (err) return rej(err);
                        acc();
                    },
                );
            });
        },

        async update(id: string, data: { name: string; email: string }): Promise<void> {
            return new Promise((acc, rej) => {
                db.run(
                    'UPDATE users SET name = ?, email = ? WHERE id = ?',
                    [data.name, data.email, id],
                    (err: Error | null) => {
                        if (err) return rej(err);
                        acc();
                    },
                );
            });
        },

        async remove(id: string): Promise<void> {
            return new Promise((acc, rej) => {
                db.run('DELETE FROM users WHERE id = ?', [id], (err: Error | null) => {
                    if (err) return rej(err);
                    acc();
                });
            });
        },
    };
}
