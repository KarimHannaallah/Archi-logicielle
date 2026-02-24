import type { TodoItem } from '../domain/TodoItem';

const store: Map<string, TodoItem> = new Map();

async function init(): Promise<void> {
    store.clear();
}

async function teardown(): Promise<void> {
    store.clear();
}

async function getAll(userId: string): Promise<TodoItem[]> {
    return Array.from(store.values()).filter(item => item.userId === userId);
}

async function getById(id: string, userId: string): Promise<TodoItem | undefined> {
    const item = store.get(id);
    return item && item.userId === userId ? item : undefined;
}

async function add(item: TodoItem): Promise<void> {
    store.set(item.id, { ...item });
}

async function update(
    id: string,
    userId: string,
    data: { name: string; completed: boolean },
): Promise<void> {
    const existing = store.get(id);
    if (existing && existing.userId === userId) {
        store.set(id, { ...existing, name: data.name, completed: data.completed });
    }
}

async function remove(id: string, userId: string): Promise<void> {
    const existing = store.get(id);
    if (existing && existing.userId === userId) {
        store.delete(id);
    }
}

const adapter = {
    init,
    teardown,
    getAll,
    getById,
    add,
    update,
    remove,
};

export = adapter;
