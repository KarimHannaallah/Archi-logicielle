import { createProjectService } from './domain/ProjectService';
import { createInMemoryProjectRepository } from './persistence/inmemory';
import { createApp } from './app';

// --- Composition root ---
function resolveRepository() {
    if (process.env.USE_INMEMORY === 'true') {
        return createInMemoryProjectRepository();
    }
    // TODO: SQLite adapter (étape 3)
    return createInMemoryProjectRepository();
}

const repository = resolveRepository();
const projectService = createProjectService(repository);
const app = createApp(projectService, { enableAuth: true });

const port = process.env.PORT || 3002;
app.listen(port, () => console.log(`[project-service] Listening on port ${port}`));

process.on('SIGINT', () => process.exit());
process.on('SIGTERM', () => process.exit());