import type { User } from './User';

export interface UserRepository {
    findById(id: string): Promise<User | undefined>;
    findByEmail(email: string): Promise<User | undefined>;
    create(user: User): Promise<void>;
    update(id: string, data: { name: string; email: string }): Promise<void>;
    remove(id: string): Promise<void>;
}
