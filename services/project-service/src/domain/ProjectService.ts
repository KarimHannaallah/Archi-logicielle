import { v4 as uuid } from 'uuid';
import type { Project } from './Project';
import type { ProjectRepository } from './ProjectRepository';

export interface ProjectService {
    createProject(name: string, userId: string): Promise<Project>;
    listProjects(userId: string): Promise<Project[]>;
    getProject(id: string, userId: string): Promise<Project | undefined>;
    closeProject(id: string, userId: string): Promise<void>;
    incrementCompletedTasks(projectId: string, userId: string): Promise<void>;
    decrementCompletedTasks(projectId: string, userId: string): Promise<void>;
    deleteProject(id: string, userId: string): Promise<void>;
    updateProject(id: string, userId: string, data: { name?: string }): Promise<void>;
}

export function createProjectService(repository: ProjectRepository): ProjectService {
    return {
        async createProject(name: string, userId: string): Promise<Project> {
            const project: Project = {
                id: uuid(),
                name,
                userId,
                status: 'open',
                totalTasks: 0,
                completedTasks: 0,
                createdAt: new Date().toISOString(),
            };
            await repository.add(project);
            return project;
        },

        async listProjects(userId: string): Promise<Project[]> {
            return repository.getAll(userId);
        },

        async getProject(id: string, userId: string): Promise<Project | undefined> {
            return repository.getById(id, userId);
        },

        async closeProject(id: string, userId: string): Promise<void> {
            await repository.update(id, userId, { status: 'closed' });
        },

        async incrementCompletedTasks(projectId: string, userId: string): Promise<void> {
            const project = await repository.getById(projectId, userId);
            if (!project) return;
            const completedTasks = project.completedTasks + 1;
            const updates: Partial<Project> = { completedTasks };
            if (completedTasks >= project.totalTasks && project.totalTasks > 0) {
                updates.status = 'closed';
            }
            await repository.update(projectId, userId, updates);
        },

        async decrementCompletedTasks(projectId: string, userId: string): Promise<void> {
            const project = await repository.getById(projectId, userId);
            if (!project) return;
            const completedTasks = Math.max(0, project.completedTasks - 1);
            await repository.update(projectId, userId, { completedTasks, status: 'open' });
        },

        async deleteProject(id: string, userId: string): Promise<void> {
            await repository.remove(id, userId);
        },

        async updateProject(id: string, userId: string, data: { name?: string }): Promise<void> {
            await repository.update(id, userId, data);
        },
    };
}