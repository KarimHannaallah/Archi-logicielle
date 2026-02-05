import { v4 as uuid } from 'uuid';
import type { TodoItem } from './TodoItem';
import type { TodoRepository } from './TodoRepository';

export interface TodoService {
    createTodo(name: string): Promise<TodoItem>;
    toggleTodo(id: string, completed: boolean): Promise<void>;
    updateTodo(id: string, name: string, completed: boolean): Promise<void>;
    deleteTodo(id: string): Promise<void>;
    listTodos(): Promise<TodoItem[]>;
    getTodo(id: string): Promise<TodoItem | undefined>;
}

export function createTodoService(repository: TodoRepository): TodoService {
    return {
        async createTodo(name: string): Promise<TodoItem> {
            const item: TodoItem = { id: uuid(), name, completed: false };
            await repository.add(item);
            return item;
        },
        async toggleTodo(id: string, completed: boolean): Promise<void> {
            const existing = await repository.getById(id);
            if (existing) {
                await repository.update(id, { name: existing.name, completed });
            }
        },
        async updateTodo(id: string, name: string, completed: boolean): Promise<void> {
            await repository.update(id, { name, completed });
        },
        async deleteTodo(id: string): Promise<void> {
            await repository.remove(id);
        },
        async listTodos(): Promise<TodoItem[]> {
            return repository.getAll();
        },
        async getTodo(id: string): Promise<TodoItem | undefined> {
            return repository.getById(id);
        },
    };
}
