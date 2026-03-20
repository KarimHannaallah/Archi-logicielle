import { createTodoService } from './domain/TodoService';
import { createAuthService } from './domain/AuthService';
import { createApp } from './app';
import { createInMemoryUserRepository } from './persistence/userInmemory';
import { createSqliteUserRepository } from './persistence/userSqlite';
import { publishEvent } from './infra/eventBus';

// --- Composition root : choix de l'adapter selon l'environnement ---
function resolveAdapter() {
    if (process.env.MYSQL_HOST) return require('./persistence/mysql');
    if (process.env.USE_INMEMORY === 'true') return require('./persistence/inmemory');
    return require('./persistence/sqlite');
}

function resolveUserAdapter() {
    if (process.env.USE_INMEMORY === 'true') return createInMemoryUserRepository();
    return createSqliteUserRepository();
}

const adapter = resolveAdapter();
const userAdapter = resolveUserAdapter();
const todoService = createTodoService(adapter, publishEvent);
const authService = createAuthService(userAdapter);
const app = createApp(todoService, { authService, enableAuth: true });

Promise.all([adapter.init(), userAdapter.init()]).then(() => {
    const port = process.env.PORT || 3000;
    app.listen(port, () => console.log(`[task-service] Listening on port ${port}`));
}).catch((err: Error) => {
    console.error(err);
    process.exit(1);
});

const gracefulShutdown = () => {
    Promise.all([
        adapter.teardown().catch(() => {}),
        userAdapter.teardown().catch(() => {}),
    ]).then(() => process.exit());
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
process.on('SIGUSR2', gracefulShutdown);
