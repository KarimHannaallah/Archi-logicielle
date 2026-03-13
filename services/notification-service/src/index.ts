import Redis from 'ioredis';
import { v4 as uuid } from 'uuid';
import { createApp } from './app';
import { addNotification } from './store/notificationStore';
import type { Notification } from './domain/Notification';

// --- Redis subscriber ---
const subscriber = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    lazyConnect: true,
    retryStrategy: (times: number) => Math.min(times * 200, 3000),
    reconnectOnError: () => true,
});

const CHANNELS = ['TaskCompleted', 'TaskReopened', 'ProjectClosed'];
const processedEvents = new Set<string>();

function buildMessage(channel: string, projectId: string): string {
    switch (channel) {
        case 'TaskCompleted': return `Tâche terminée dans le projet ${projectId}`;
        case 'TaskReopened': return `Tâche réouverte dans le projet ${projectId}`;
        case 'ProjectClosed': return `Projet ${projectId} terminé ! Toutes les tâches sont complétées.`;
        default: return `Événement ${channel}`;
    }
}

subscriber.connect()
    .then(() => subscriber.subscribe(...CHANNELS))
    .then(() => console.log(`[notification-service] Subscribed to: ${CHANNELS.join(', ')}`))
    .catch((err) => console.warn('[notification-service] Redis not available:', err.message));

subscriber.on('message', (channel: string, message: string) => {
    try {
        const event = JSON.parse(message);

        // Idempotence
        if (processedEvents.has(event.eventId)) {
            console.log(`[notification-service] DUPLICATE ${channel} | eventId=${event.eventId} — skipping`);
            return;
        }
        processedEvents.add(event.eventId);
        if (processedEvents.size > 10000) {
            const first = processedEvents.values().next().value;
            processedEvents.delete(first);
        }

        console.log(`[${event.occurredAt}] RECEIVED ${channel} | eventId=${event.eventId}`);

        const notification: Notification = {
            id: uuid(),
            eventType: channel,
            eventId: event.eventId,
            message: buildMessage(channel, event.projectId),
            userId: event.userId,
            projectId: event.projectId,
            taskId: event.taskId,
            createdAt: new Date().toISOString(),
            read: false,
        };

        addNotification(notification);
    } catch (err) {
        console.error(`[notification-service] Error processing ${channel}:`, err);
    }
});

// --- Express server ---
const app = createApp();
const port = process.env.PORT || 3003;
app.listen(port, () => console.log(`[notification-service] Listening on port ${port}`));

process.on('SIGINT', () => process.exit());
process.on('SIGTERM', () => process.exit());
