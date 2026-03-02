import crypto from 'crypto';
import { v4 as uuid } from 'uuid';
import type { User } from './User';
import type { UserRepository } from './UserRepository';

export interface AuthService {
    register(email: string, name: string, password: string, consent: boolean): Promise<User>;
    login(email: string, password: string): Promise<User>;
    getProfile(userId: string): Promise<User | undefined>;
    updateProfile(userId: string, data: { name: string; email: string }): Promise<User | undefined>;
    deleteAccount(userId: string): Promise<void>;
}

function hashPassword(password: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
    const [salt, hash] = stored.split(':');
    const derived = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(derived, 'hex'));
}

export function createAuthService(userRepository: UserRepository): AuthService {
    return {
        async register(email: string, name: string, password: string, consent: boolean): Promise<User> {
            const existing = await userRepository.findByEmail(email);
            if (existing) {
                throw new Error('Email already in use');
            }
            if (!consent) {
                throw new Error('Consent is required for data processing (RGPD)');
            }
            const user: User = {
                id: uuid(),
                email,
                name,
                passwordHash: hashPassword(password),
                createdAt: new Date().toISOString(),
                consentGiven: consent,
            };
            await userRepository.create(user);
            return user;
        },

        async login(email: string, password: string): Promise<User> {
            const user = await userRepository.findByEmail(email);
            if (!user) {
                throw new Error('Invalid credentials');
            }
            if (!verifyPassword(password, user.passwordHash)) {
                throw new Error('Invalid credentials');
            }
            return user;
        },

        async getProfile(userId: string): Promise<User | undefined> {
            return userRepository.findById(userId);
        },

        async updateProfile(userId: string, data: { name: string; email: string }): Promise<User | undefined> {
            const existing = await userRepository.findById(userId);
            if (!existing) {
                throw new Error('User not found');
            }
            if (data.email !== existing.email) {
                const emailTaken = await userRepository.findByEmail(data.email);
                if (emailTaken) {
                    throw new Error('Email already in use');
                }
            }
            await userRepository.update(userId, data);
            return userRepository.findById(userId);
        },

        async deleteAccount(userId: string): Promise<void> {
            await userRepository.remove(userId);
        },
    };
}
