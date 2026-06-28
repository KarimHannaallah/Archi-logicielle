import fs from 'node:fs';
import path from 'node:path';
import type { Project } from '../domain/Project';
import type { ProjectRepository } from '../domain/ProjectRepository';
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

export function createMysqlProjectRepository(): ProjectRepository & { init(): Promise<void>; teardown(): Promise<void> } {
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
            console.log(`[project-service] Connected to mysql db at host ${host}`);
        },

        async teardown(): Promise<void> {
            return new Promise((acc, rej) => {
                pool.end((err: Error | null) => (err ? rej(err) : acc()));
            });
        },

        async getAll(userId: string): Promise<Project[]> {
            return new Promise((acc, rej) => {
                pool.query(
                    'SELECT * FROM projects WHERE userId = ? ORDER BY createdAt DESC',
                    [userId],
                    (err: Error | null, rows: any[]) => {
                        if (err) return rej(err);
                        acc(rows.map(mapRow));
                    },
                );
            });
        },

        async getById(id: string, userId: string): Promise<Project | undefined> {
            return new Promise((acc, rej) => {
                pool.query(
                    'SELECT * FROM projects WHERE id = ? AND userId = ?',
                    [id, userId],
                    (err: Error | null, rows: any[]) => {
                        if (err) return rej(err);
                        acc(rows.length ? mapRow(rows[0]) : undefined);
                    },
                );
            });
        },

        async add(project: Project): Promise<void> {
            return new Promise((acc, rej) => {
                pool.query(
                    'INSERT INTO projects (id, name, userId, status, totalTasks, completedTasks, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [project.id, project.name, project.userId, project.status, project.totalTasks, project.completedTasks, project.createdAt],
                    (err: Error | null) => (err ? rej(err) : acc()),
                );
            });
        },

        async update(id: string, userId: string, data: Partial<Project>): Promise<void> {
            const fields: string[] = [];
            const values: any[] = [];

            if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
            if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }
            if (data.totalTasks !== undefined) { fields.push('totalTasks = ?'); values.push(data.totalTasks); }
            if (data.completedTasks !== undefined) { fields.push('completedTasks = ?'); values.push(data.completedTasks); }

            if (fields.length === 0) return;

            values.push(id, userId);

            return new Promise((acc, rej) => {
                pool.query(
                    `UPDATE projects SET ${fields.join(', ')} WHERE id = ? AND userId = ?`,
                    values,
                    (err: Error | null) => (err ? rej(err) : acc()),
                );
            });
        },

        async remove(id: string, userId: string): Promise<void> {
            return new Promise((acc, rej) => {
                pool.query(
                    'DELETE FROM projects WHERE id = ? AND userId = ?',
                    [id, userId],
                    (err: Error | null) => (err ? rej(err) : acc()),
                );
            });
        },
    };
}

function mapRow(row: any): Project {
    return {
        id: row.id,
        name: row.name,
        userId: row.userId,
        status: row.status as 'open' | 'closed',
        totalTasks: row.totalTasks,
        completedTasks: row.completedTasks,
        createdAt: row.createdAt,
    };
}