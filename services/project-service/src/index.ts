import { createProjectService } from './domain/ProjectService';
import { createInMemoryProjectRepository } from './persistence/inmemory';
import { createSqliteProjectRepository } from './persistence/sqlite';
import { createApp } from './app';
import { startEventSubscriber } from './infra/eventBus';

// --- Composition root ---
function resolveRepository() {
    if (process.env.USE_INMEMORY === 'true') {
        return createInMemoryProjectRepository();
    }
    return createSqliteProjectRepository();
}

const repository = resolveRepository();
const projectService = createProjectService(repository);
const app = createApp(projectService, { enableAuth: true });

const port = process.env.PORT || 3002;

const init = (repository as any).init;
const initPromise: Promise<void> = typeof init === 'function' ? init.call(repository) : Promise.resolve();

initPromise
    .then(() => {
        startEventSubscriber(projectService);
        app.listen(port, () => console.log(`[project-service] Listening on port ${port}`));
    })
    .catch((err: Error) => {
        console.error('[project-service] Failed to initialise repository:', err);
        process.exit(1);
    });

const gracefulShutdown = () => {
    const teardown = (repository as any).teardown;
    const p: Promise<void> = typeof teardown === 'function' ? teardown.call(repository) : Promise.resolve();
    p.catch(() => {}).then(() => process.exit());
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
