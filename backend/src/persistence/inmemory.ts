import type { TodoItem } from '../domain/TodoItem';

const store: Map<string, TodoItem> = new Map();

async function init(): Promise<void> {
    store.clear();
}

async function teardown(): Promise<void> {
    store.clear();
}

async function getAll(): Promise<TodoItem[]> {
    return Array.from(store.values());
}

async function getById(id: string): Promise<TodoItem | undefined> {
    return store.get(id);
}

async function add(item: TodoItem): Promise<void> {
    store.set(item.id, { ...item });
}

async function update(
    id: string,
    data: { name: string; completed: boolean },
): Promise<void> {
    const existing = store.get(id);
    if (existing) {
        store.set(id, { ...existing, name: data.name, completed: data.completed });
    }
}

async function remove(id: string): Promise<void> {
    store.delete(id);
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
