import fs from 'fs';
import path from 'path';
import type { Project } from '../domain/Project';
import type { ProjectRepository } from '../domain/ProjectRepository';

const sqlite3 = require('sqlite3').verbose();

export function createSqliteProjectRepository(
    dbLocation?: string,
): ProjectRepository & { init(): Promise<void>; teardown(): Promise<void> } {
    const location = dbLocation || process.env.SQLITE_DB_LOCATION || '/data/project.db';
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

                    if (process.env.NODE_ENV !== 'test')
                        console.log(`[project-service] Using sqlite database at ${location}`);

                    db.run(
                        `CREATE TABLE IF NOT EXISTS projects (
                            id VARCHAR(36) PRIMARY KEY,
                            name VARCHAR(255) NOT NULL,
                            userId VARCHAR(36) NOT NULL,
                            status VARCHAR(10) NOT NULL DEFAULT 'open',
                            totalTasks INTEGER NOT NULL DEFAULT 0,
                            completedTasks INTEGER NOT NULL DEFAULT 0,
                            createdAt TEXT NOT NULL
                        )`,
                        (err: Error | null) => {
                            if (err) return rej(err);
                            acc();
                        },
                    );
                });
            });
        },

        teardown(): Promise<void> {
            return new Promise((acc, rej) => {
                db.close((err: Error | null) => {
                    if (err) rej(err);
                    else acc();
                });
            });
        },

        async getAll(userId: string): Promise<Project[]> {
            return new Promise((acc, rej) => {
                db.all(
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
                db.get(
                    'SELECT * FROM projects WHERE id = ? AND userId = ?',
                    [id, userId],
                    (err: Error | null, row: any) => {
                        if (err) return rej(err);
                        acc(row ? mapRow(row) : undefined);
                    },
                );
            });
        },

        async add(project: Project): Promise<void> {
            return new Promise((acc, rej) => {
                db.run(
                    'INSERT INTO projects (id, name, userId, status, totalTasks, completedTasks, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [
                        project.id,
                        project.name,
                        project.userId,
                        project.status,
                        project.totalTasks,
                        project.completedTasks,
                        project.createdAt,
                    ],
                    (err: Error | null) => {
                        if (err) return rej(err);
                        acc();
                    },
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
                db.run(
                    `UPDATE projects SET ${fields.join(', ')} WHERE id = ? AND userId = ?`,
                    values,
                    (err: Error | null) => {
                        if (err) return rej(err);
                        acc();
                    },
                );
            });
        },

        async remove(id: string, userId: string): Promise<void> {
            return new Promise((acc, rej) => {
                db.run(
                    'DELETE FROM projects WHERE id = ? AND userId = ?',
                    [id, userId],
                    (err: Error | null) => {
                        if (err) return rej(err);
                        acc();
                    },
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
