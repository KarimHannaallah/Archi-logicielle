import type { User } from '../domain/User';
import type { UserRepository } from '../domain/UserRepository';

const store: Map<string, User> = new Map();

export function createInMemoryUserRepository(): UserRepository & { init(): Promise<void>; teardown(): Promise<void> } {
    return {
        async init(): Promise<void> {
            store.clear();
        },
        async teardown(): Promise<void> {
            store.clear();
        },
        async findById(id: string): Promise<User | undefined> {
            return store.get(id);
        },
        async findByEmail(email: string): Promise<User | undefined> {
            for (const user of store.values()) {
                if (user.email === email) return user;
            }
            return undefined;
        },
        async create(user: User): Promise<void> {
            store.set(user.id, { ...user });
        },
        async update(id: string, data: { name: string; email: string }): Promise<void> {
            const existing = store.get(id);
            if (existing) {
                store.set(id, { ...existing, name: data.name, email: data.email });
            }
        },
        async remove(id: string): Promise<void> {
            store.delete(id);
        },
    };
}
