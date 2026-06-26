import { createTodoService } from './domain/TodoService';
import { createApp } from './app';
import { publishEvent } from './infra/eventBus';

// --- Composition root : choix de l'adapter selon l'environnement ---
function resolveAdapter() {
    if (process.env.MYSQL_HOST) return require('./persistence/mysql');
    if (process.env.USE_INMEMORY === 'true') return require('./persistence/inmemory');
    return require('./persistence/sqlite');
}

const adapter = resolveAdapter();
const todoService = createTodoService(adapter, publishEvent);
const app = createApp(todoService);

Promise.all([adapter.init()]).then(() => {
    const port = process.env.PORT || 3000;
    app.listen(port, () => console.log(`[task-service] Listening on port ${port}`));
}).catch((err: Error) => {
    console.error(err);
    process.exit(1);
});

const gracefulShutdown = () => {
    Promise.all([
        adapter.teardown().catch(() => {}),
    ]).then(() => process.exit());
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
process.on('SIGUSR2', gracefulShutdown);
