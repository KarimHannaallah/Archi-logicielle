import { v4 as uuid } from 'uuid';
import type { TodoItem } from './TodoItem';
import type { TodoRepository } from './TodoRepository';

export type EventPublisher = (channel: string, payload: object) => Promise<void>;

export interface TodoService {
    createTodo(name: string, userId?: string, projectId?: string): Promise<TodoItem>;
    toggleTodo(id: string, completed: boolean): Promise<void>;
    updateTodo(id: string, name: string, completed: boolean): Promise<void>;
    deleteTodo(id: string): Promise<void>;
    listTodos(userId?: string, projectId?: string): Promise<TodoItem[]>;
    getTodo(id: string): Promise<TodoItem | undefined>;
}

export function createTodoService(repository: TodoRepository, publishEvent?: EventPublisher): TodoService {
    return {
        async createTodo(name: string, userId = '', projectId = ''): Promise<TodoItem> {
            const item: TodoItem = { id: uuid(), name, completed: false, userId, projectId };
            await repository.add(item);
            if (publishEvent && projectId) {
                await publishEvent('TaskCreated', { taskId: item.id, projectId, userId });
            }
            return item;
        },
        async toggleTodo(id: string, completed: boolean): Promise<void> {
            const existing = await repository.getById(id);
            if (existing) {
                if (publishEvent) {
                    if (!existing.completed && completed) {
                        await publishEvent('TaskCompleted', { taskId: id, projectId: existing.projectId, userId: existing.userId });
                    } else if (existing.completed && !completed) {
                        await publishEvent('TaskReopened', { taskId: id, projectId: existing.projectId, userId: existing.userId });
                    }
                }
                await repository.update(id, { name: existing.name, completed });
            }
        },
        async updateTodo(id: string, name: string, completed: boolean): Promise<void> {
            const existing = await repository.getById(id);
            if (existing && publishEvent) {
                if (!existing.completed && completed) {
                    await publishEvent('TaskCompleted', { taskId: id, projectId: existing.projectId, userId: existing.userId });
                } else if (existing.completed && !completed) {
                    await publishEvent('TaskReopened', { taskId: id, projectId: existing.projectId, userId: existing.userId });
                }
            }
            await repository.update(id, { name, completed });
        },
        async deleteTodo(id: string): Promise<void> {
            const existing = await repository.getById(id);
            await repository.remove(id);
            if (publishEvent && existing?.projectId) {
                await publishEvent('TaskDeleted', {
                    taskId: id,
                    projectId: existing.projectId,
                    userId: existing.userId,
                    wasCompleted: existing.completed,
                });
            }
        },
        async listTodos(userId?: string, projectId?: string): Promise<TodoItem[]> {
            return repository.getAll(userId, projectId);
        },
        async getTodo(id: string): Promise<TodoItem | undefined> {
            return repository.getById(id);
        },
    };
}
