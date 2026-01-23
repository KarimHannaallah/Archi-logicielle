import { v4 as uuid } from 'uuid';

interface TodoItem {
    id: string;
    name: string;
    completed: boolean;
}

export class InMemoryRepository {
    private items: TodoItem[] = [];

    async getAll(): Promise<TodoItem[]> {
        return [...this.items];
    }

    async getById(id: string): Promise<TodoItem | undefined> {
        return this.items.find(item => item.id === id);
    }

    async add(item: TodoItem): Promise<void> {
        this.items.push({ ...item });
    }

    async update(id: string, data: Partial<TodoItem>): Promise<void> {
        const item = this.items.find(i => i.id === id);
        if (item) {
            Object.assign(item, data);
        }
    }

    async remove(id: string): Promise<void> {
        this.items = this.items.filter(item => item.id !== id);
    }
}