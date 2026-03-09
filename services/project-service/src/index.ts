import { createProjectService } from './domain/ProjectService';
import { createInMemoryProjectRepository } from './persistence/inmemory';
import { createApp } from './app';
import { createSubscriber, createPublisher, publishEvent } from './infra/eventBus';

// --- Composition root ---
function resolveRepository() {
    if (process.env.USE_INMEMORY === 'true') {
        return createInMemoryProjectRepository();
    }
    return createInMemoryProjectRepository();
}

const repository = resolveRepository();
const projectService = createProjectService(repository);
const app = createApp(projectService, { enableAuth: true });

// --- Redis event subscriber ---
const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);

const subscriber = createSubscriber(redisHost, redisPort);
const publisher = createPublisher(redisHost, redisPort);

const CHANNELS = ['TaskCreated', 'TaskCompleted', 'TaskReopened'];
const processedEvents = new Set<string>();

subscriber.connect()
    .then(() => subscriber.subscribe(...CHANNELS))
    .then(() => console.log(`[project-service] Subscribed to: ${CHANNELS.join(', ')}`))
    .catch((err) => console.warn('[project-service] Redis subscriber not available:', err.message));

subscriber.on('message', async (channel: string, message: string) => {
    try {
        const event = JSON.parse(message);

        // Idempotence
        if (processedEvents.has(event.eventId)) {
            console.log(`[project-service] DUPLICATE ${channel} | eventId=${event.eventId} — skipping`);
            return;
        }
        processedEvents.add(event.eventId);
        if (processedEvents.size > 10000) {
            const first = processedEvents.values().next().value;
            processedEvents.delete(first);
        }

        console.log(`[project-service] RECEIVED ${channel} | eventId=${event.eventId} | projectId=${event.projectId}`);

        const { projectId, userId } = event;
        if (!projectId || !userId) return;

        if (channel === 'TaskCreated') {
            const project = await projectService.getProject(projectId, userId);
            if (project) {
                await repository.update(projectId, userId, { totalTasks: project.totalTasks + 1 });
                console.log(`[project-service] totalTasks incremented for project ${projectId}`);
            }
        } else if (channel === 'TaskCompleted') {
            await projectService.incrementCompletedTasks(projectId, userId);
            const project = await projectService.getProject(projectId, userId);
            if (project && project.status === 'closed') {
                await publishEvent(publisher, 'ProjectClosed', { projectId, userId });
            }
        } else if (channel === 'TaskReopened') {
            await projectService.decrementCompletedTasks(projectId, userId);
        }
    } catch (err) {
        console.error(`[project-service] Error processing ${channel}:`, err);
    }
});

// --- Start Express ---
const port = process.env.PORT || 3002;
app.listen(port, () => console.log(`[project-service] Listening on port ${port}`));

process.on('SIGINT', () => process.exit());
process.on('SIGTERM', () => process.exit());