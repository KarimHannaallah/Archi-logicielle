import type { TodoItem } from './TodoItem';

export interface TodoRepository {
    getAll(): Promise<TodoItem[]>;
    getById(id: string): Promise<TodoItem | undefined>;
    add(item: TodoItem): Promise<void>;
    update(id: string, data: { name: string; completed: boolean }): Promise<void>;
    remove(id: string): Promise<void>;
}
