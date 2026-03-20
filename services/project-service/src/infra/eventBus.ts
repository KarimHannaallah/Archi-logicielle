import Redis from 'ioredis';
import { v4 as uuid } from 'uuid';
import type { ProjectService } from '../domain/ProjectService';

// --- Publisher ---

const publisherClient = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    lazyConnect: true,
    retryStrategy: (times) => Math.min(times * 200, 3000),
    reconnectOnError: () => true,
});

publisherClient.on('connect', () => console.log('[project-service] Redis publisher connected'));
publisherClient.on('error', (err) => {
    console.warn(`[project-service] Redis publisher error: ${err.message}`);
});

async function publishEvent(channel: string, payload: object): Promise<void> {
    const event = {
        eventId: uuid(),
        eventType: channel,
        version: 1,
        occurredAt: new Date().toISOString(),
        ...payload,
    };
    try {
        const subscribers = await publisherClient.publish(channel, JSON.stringify(event));
        console.log(
            `[project-service] [${event.occurredAt}] PUBLISHED ${channel} | eventId=${event.eventId} | subscribers=${subscribers}`,
        );
    } catch (err: any) {
        console.warn(`[project-service] Could not publish ${channel}: ${err.message}`);
    }
}

// --- Idempotency guard ---
const processedEventIds = new Set<string>();

function isAlreadyProcessed(eventId: string): boolean {
    if (processedEventIds.has(eventId)) return true;
    processedEventIds.add(eventId);
    if (processedEventIds.size > 10_000) {
        const first = processedEventIds.values().next().value;
        if (first) processedEventIds.delete(first);
    }
    return false;
}

// --- Subscriber ---

export function startEventSubscriber(projectService: ProjectService): void {
    const subscriber = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        lazyConnect: true,
        retryStrategy: (times) => Math.min(times * 200, 3000),
        reconnectOnError: () => true,
    });

    subscriber.on('connect', () => console.log('[project-service] Redis subscriber connected'));
    subscriber.on('error', (err) => {
        console.warn(`[project-service] Redis subscriber error: ${err.message}`);
    });
    subscriber.on('reconnecting', () => console.log('[project-service] Redis subscriber reconnecting...'));

    subscriber.subscribe('TaskCompleted', 'TaskReopened', 'TaskCreated', 'TaskDeleted').then(() => {
        console.log('[project-service] Subscribed to: TaskCompleted, TaskReopened, TaskCreated, TaskDeleted');
    }).catch((err) => {
        console.warn('[project-service] Could not subscribe to Redis:', err.message);
    });

    subscriber.on('message', async (channel, message) => {
        const receivedAt = new Date().toISOString();
        try {
            const event = JSON.parse(message);
            const { eventId = 'n/a', projectId, userId, taskId } = event;

            if (isAlreadyProcessed(eventId)) {
                console.warn(
                    `[project-service] [${receivedAt}] DUPLICATE ${channel} | eventId=${eventId} — skipping`,
                );
                return;
            }

            console.log(
                `[project-service] [${receivedAt}] RECEIVED ${channel} | eventId=${eventId} | projectId=${projectId}`,
            );

            if (channel === 'TaskCreated') {
                await projectService.incrementTotalTasks(projectId, userId);

            } else if (channel === 'TaskCompleted') {
                await projectService.incrementCompletedTasks(projectId, userId);
                const project = await projectService.getProject(projectId, userId);
                if (project?.status === 'closed') {
                    await publishEvent('ProjectClosed', { projectId, projectName: project.name, userId });
                }
                // Enriched notification event with project name
                if (project) {
                    await publishEvent('TaskCompletedNotification', { taskId, projectId, projectName: project.name, userId });
                }

            } else if (channel === 'TaskReopened') {
                await projectService.decrementCompletedTasks(projectId, userId);
                const project = await projectService.getProject(projectId, userId);
                // Enriched notification event with project name
                if (project) {
                    await publishEvent('TaskReopenedNotification', { taskId, projectId, projectName: project.name, userId });
                }

            } else if (channel === 'TaskDeleted') {
                if (event.wasCompleted) {
                    await projectService.decrementCompletedTasks(projectId, userId);
                }
                await projectService.decrementTotalTasks(projectId, userId);
                const project = await projectService.getProject(projectId, userId);
                // Auto-close if all remaining tasks are completed
                if (project && project.totalTasks > 0 && project.completedTasks >= project.totalTasks && project.status !== 'closed') {
                    await projectService.closeProject(projectId, userId);
                    await publishEvent('ProjectClosed', { projectId, projectName: project.name, userId });
                }
                // Enriched notification event with project name
                if (project) {
                    await publishEvent('TaskDeletedNotification', { taskId, projectId, projectName: project.name, userId });
                }
            }
        } catch (err: any) {
            console.error(`[project-service] Error handling ${channel}: ${err.message}`);
        }
    });
}
