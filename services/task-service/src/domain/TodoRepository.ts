import type { TodoItem } from './TodoItem';

export interface TodoRepository {
    getAll(userId: string, projectId?: string): Promise<TodoItem[]>;
    getById(id: string, userId: string): Promise<TodoItem | undefined>;
    add(item: TodoItem): Promise<void>;
    update(id: string, userId: string, data: { name: string; completed: boolean }): Promise<void>;
    remove(id: string, userId: string): Promise<void>;
}
