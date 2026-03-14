import { v4 as uuid } from 'uuid';
import type { TodoItem } from './TodoItem';
import type { TodoRepository } from './TodoRepository';

export interface EventPublisher {
    publish(channel: string, payload: object): Promise<void>;
}

const noopPublisher: EventPublisher = { async publish() {} };

export interface TodoService {
    createTodo(userId: string, name: string, projectId?: string): Promise<TodoItem>;
    toggleTodo(userId: string, id: string, completed: boolean): Promise<void>;
    updateTodo(userId: string, id: string, name: string, completed: boolean): Promise<void>;
    deleteTodo(userId: string, id: string): Promise<void>;
    listTodos(userId: string, projectId?: string): Promise<TodoItem[]>;
    getTodo(userId: string, id: string): Promise<TodoItem | undefined>;
}

export function createTodoService(repository: TodoRepository, eventPublisher?: EventPublisher): TodoService {
    const publisher = eventPublisher || noopPublisher;

    return {
        async createTodo(userId: string, name: string, projectId?: string): Promise<TodoItem> {
            const item: TodoItem = { id: uuid(), name, completed: false, userId, projectId: projectId || '' };
            await repository.add(item);
            if (item.projectId) {
                await publisher.publish('TaskCreated', { taskId: item.id, projectId: item.projectId, userId });
            }
            return item;
        },
        async toggleTodo(userId: string, id: string, completed: boolean): Promise<void> {
            const existing = await repository.getById(id, userId);
            if (!existing) return;
            const wasCompleted = existing.completed;
            await repository.update(id, userId, { name: existing.name, completed });
            if (!wasCompleted && completed && existing.projectId) {
                await publisher.publish('TaskCompleted', { taskId: id, projectId: existing.projectId, userId });
            } else if (wasCompleted && !completed && existing.projectId) {
                await publisher.publish('TaskReopened', { taskId: id, projectId: existing.projectId, userId });
            }
        },
        async updateTodo(userId: string, id: string, name: string, completed: boolean): Promise<void> {
            const existing = await repository.getById(id, userId);
            if (!existing) return;
            const wasCompleted = existing.completed;
            await repository.update(id, userId, { name, completed });
            if (!wasCompleted && completed && existing.projectId) {
                await publisher.publish('TaskCompleted', { taskId: id, projectId: existing.projectId, userId });
            } else if (wasCompleted && !completed && existing.projectId) {
                await publisher.publish('TaskReopened', { taskId: id, projectId: existing.projectId, userId });
            }
        },
        async deleteTodo(userId: string, id: string): Promise<void> {
            const existing = await repository.getById(id, userId);
            await repository.remove(id, userId);
            if (existing && existing.projectId) {
                if (existing.completed) {
                    await publisher.publish('TaskDeleted', { taskId: id, projectId: existing.projectId, userId, wasCompleted: true });
                } else {
                    await publisher.publish('TaskDeleted', { taskId: id, projectId: existing.projectId, userId, wasCompleted: false });
                }
            }
        },
        async listTodos(userId: string, projectId?: string): Promise<TodoItem[]> {
            return repository.getAll(userId, projectId);
        },
        async getTodo(userId: string, id: string): Promise<TodoItem | undefined> {
            return repository.getById(id, userId);
        },
    };
}
