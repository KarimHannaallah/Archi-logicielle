import path from 'node:path';
import { Verifier } from '@pact-foundation/pact';
import { createApp } from '../../services/auth-service/src/app';
import { createAuthService } from '../../services/auth-service/src/domain/AuthService';
import { createInMemoryUserRepository } from '../../services/auth-service/src/persistence/inmemory';
import type { Server } from 'node:http';

const PORT = 3001;
let server: Server;

beforeAll(async () => {
    const repo = createInMemoryUserRepository();
    await repo.init();

    // Pre-populate state for "user alice@example.com exists"
    const authService = createAuthService(repo);
    await authService.register('alice@example.com', 'Alice', 'secret123', true);

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
        }).verifyProvider();
    }, 30000);
});