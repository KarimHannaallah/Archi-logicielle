import type { Project } from '../domain/Project';
import type { ProjectRepository } from '../domain/ProjectRepository';

const store: Map<string, Project> = new Map();

export function createInMemoryProjectRepository(): ProjectRepository {
    return {
        async getAll(userId: string): Promise<Project[]> {
            return Array.from(store.values()).filter((p) => p.userId === userId);
        },

        async getById(id: string, userId: string): Promise<Project | undefined> {
            const project = store.get(id);
            if (project && project.userId === userId) return project;
            return undefined;
        },

        async add(project: Project): Promise<void> {
            store.set(project.id, { ...project });
        },

        async update(id: string, userId: string, data: Partial<Project>): Promise<void> {
            const existing = store.get(id);
            if (existing && existing.userId === userId) {
                store.set(id, { ...existing, ...data });
            }
        },

        async remove(id: string, userId: string): Promise<void> {
            const existing = store.get(id);
            if (existing && existing.userId === userId) {
                store.delete(id);
            }
        },
    };
}

export function clearStore(): void {
    store.clear();
}
