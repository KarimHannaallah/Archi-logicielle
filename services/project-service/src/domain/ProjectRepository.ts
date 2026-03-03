import type { Project } from './Project';

export interface ProjectRepository {
    getAll(userId: string): Promise<Project[]>;
    getById(id: string, userId: string): Promise<Project | undefined>;
    add(project: Project): Promise<void>;
    update(id: string, userId: string, data: Partial<Project>): Promise<void>;
    remove(id: string, userId: string): Promise<void>;
}
