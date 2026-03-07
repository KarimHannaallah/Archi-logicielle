import { v4 as uuid } from 'uuid';
import type { TodoItem } from './TodoItem';
import type { TodoRepository } from './TodoRepository';

export interface TodoService {
    createTodo(userId: string, name: string, projectId?: string): Promise<TodoItem>;
    toggleTodo(userId: string, id: string, completed: boolean): Promise<void>;
    updateTodo(userId: string, id: string, name: string, completed: boolean): Promise<void>;
    deleteTodo(userId: string, id: string): Promise<void>;
    listTodos(userId: string, projectId?: string): Promise<TodoItem[]>;
    getTodo(userId: string, id: string): Promise<TodoItem | undefined>;
}

export function createTodoService(repository: TodoRepository): TodoService {
    return {
        async createTodo(userId: string, name: string, projectId?: string): Promise<TodoItem> {
            const item: TodoItem = { id: uuid(), name, completed: false, userId, projectId: projectId || '' };
            await repository.add(item);
            return item;
        },
        async toggleTodo(userId: string, id: string, completed: boolean): Promise<void> {
            const existing = await repository.getById(id, userId);
            if (existing) {
                await repository.update(id, userId, { name: existing.name, completed });
            }
        },
        async updateTodo(userId: string, id: string, name: string, completed: boolean): Promise<void> {
            await repository.update(id, userId, { name, completed });
        },
        async deleteTodo(userId: string, id: string): Promise<void> {
            await repository.remove(id, userId);
        },
        async listTodos(userId: string, projectId?: string): Promise<TodoItem[]> {
            return repository.getAll(userId, projectId);
        },
        async getTodo(userId: string, id: string): Promise<TodoItem | undefined> {
            return repository.getById(id, userId);
        },
    };
}
