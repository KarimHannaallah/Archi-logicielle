import { createAuthService } from './domain/AuthService';
import { createApp } from './app';
import { createInMemoryUserRepository } from './persistence/inmemory';
import { createSqliteUserRepository } from './persistence/sqlite';

function resolveUserAdapter() {
    if (process.env.USE_INMEMORY === 'true') return createInMemoryUserRepository();
    return createSqliteUserRepository();
}

const userAdapter = resolveUserAdapter();
const authService = createAuthService(userAdapter);
const app = createApp(authService);

userAdapter.init().then(() => {
    const port = process.env.PORT || 3001;
    app.listen(port, () => console.log(`[auth-service] Listening on port ${port}`));
}).catch((err: Error) => {
    console.error('[auth-service] Failed to initialise:', err);
    process.exit(1);
});

const gracefulShutdown = () => {
    userAdapter.teardown().catch(() => {}).then(() => process.exit());
};
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
process.on('SIGUSR2', gracefulShutdown);