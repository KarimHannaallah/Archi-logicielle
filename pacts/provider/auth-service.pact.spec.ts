import path from 'node:path';
import jwt from 'jsonwebtoken';
import { Verifier } from '@pact-foundation/pact';
import { createApp } from '../../services/auth-service/src/app';
import { createAuthService } from '../../services/auth-service/src/domain/AuthService';
import { createInMemoryUserRepository } from '../../services/auth-service/src/persistence/inmemory';
import type { Server } from 'node:http';

const PORT = 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
let server: Server;
const repo = createInMemoryUserRepository();
const authService = createAuthService(repo);
let aliceToken = '';

beforeAll(async () => {
    await repo.init();
    const app = createApp(authService);
    server = app.listen(PORT);
});

afterAll(() => {
    server.close();
});

describe('auth-service provider pact verification', () => {
    it('validates the expectations of frontend', async () => {
        await new Verifier({
            provider: 'auth-service',
            providerBaseUrl: `http://localhost:${PORT}`,
            pactUrls: [path.resolve(__dirname, '../frontend-auth-service.json')],
            logLevel: 'warn',
            stateHandlers: {
                'email alice@example.com is not taken': async () => {
                    await repo.init();
                },
                'user alice@example.com exists with password secret123': async () => {
                    await repo.init();
                    const user = await authService.register('alice@example.com', 'Alice', 'secret123', true);
                    aliceToken = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '1h' });
                },
                'user alice@example.com exists with a valid token': async () => {
                    await repo.init();
                    const user = await authService.register('alice@example.com', 'Alice', 'secret123', true);
                    aliceToken = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '1h' });
                },
            },
            requestFilter: (req, _res, next) => {
                if (req.path.includes('/verify') && req.headers['authorization']) {
                    req.headers['authorization'] = `Bearer ${aliceToken}`;
                }
                next();
            },
        }).verifyProvider();
    }, 30000);
});