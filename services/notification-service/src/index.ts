import Redis from 'ioredis';
import { v4 as uuid } from 'uuid';
import { createApp } from './app';
import { addNotification } from './store/notificationStore';
import type { Notification } from './domain/Notification';

// Enriched notification events (published by project-service, include projectName)
const CHANNELS = ['TaskCompletedNotification', 'TaskReopenedNotification', 'TaskDeletedNotification', 'ProjectClosed'];

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

// --- Message builder ---
function buildMessage(channel: string, event: any): string {
    const name = event.projectName || event.projectId;
    switch (channel) {
        case 'TaskCompletedNotification':
            return `Tâche terminée dans le projet "${name}"`;
        case 'TaskReopenedNotification':
            return `Tâche réouverte dans le projet "${name}"`;
        case 'TaskDeletedNotification':
            return `Tâche supprimée dans le projet "${name}"`;
        case 'ProjectClosed':
            return `Projet "${name}" terminé ! Toutes les tâches sont complétées.`;
        default:
            return `Événement ${channel} reçu`;
    }
}

// --- Event type for the frontend (strip "Notification" suffix for icon mapping) ---
function toEventType(channel: string): string {
    return channel.replace('Notification', '');
}

// --- Redis subscriber ---
const subscriber = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    lazyConnect: true,
    retryStrategy: (times) => Math.min(times * 200, 3000),
    reconnectOnError: () => true,
});

subscriber.on('connect', () => console.log('[notification-service] Redis subscriber connected'));
subscriber.on('error', (err) => {
    console.warn(`[notification-service] Redis subscriber error: ${err.message}`);
});
subscriber.on('reconnecting', () => console.log('[notification-service] Redis subscriber reconnecting...'));

subscriber.subscribe(...CHANNELS).then(() => {
    console.log(`[notification-service] Subscribed to: ${CHANNELS.join(', ')}`);
}).catch((err) => {
    console.warn('[notification-service] Could not subscribe to Redis:', err.message);
});

subscriber.on('message', (channel, message) => {
    const receivedAt = new Date().toISOString();
    try {
        const event = JSON.parse(message);
        const { eventId = 'n/a', projectId = '', userId = '', taskId } = event;

        if (isAlreadyProcessed(eventId)) {
            console.warn(
                `[notification-service] [${receivedAt}] DUPLICATE ${channel} | eventId=${eventId} — skipping`,
            );
            return;
        }

        console.log(
            `[notification-service] [${receivedAt}] RECEIVED ${channel} | eventId=${eventId} | projectId=${projectId}`,
        );

        const notification: Notification = {
            id: uuid(),
            eventType: toEventType(channel),
            eventId,
            message: buildMessage(channel, event),
            userId,
            projectId,
            taskId: taskId || undefined,
            createdAt: receivedAt,
            read: false,
        };

        addNotification(notification);
        console.log(
            `[notification-service] [${receivedAt}] STORED notification id=${notification.id} for userId=${userId}`,
        );
    } catch (err: any) {
        console.error(`[notification-service] Error handling ${channel}: ${err.message}`);
    }
});

// --- Express server ---
const app = createApp();
const port = process.env.PORT || 3003;
app.listen(port, () => console.log(`[notification-service] HTTP listening on port ${port}`));

process.on('SIGINT', () => { subscriber.disconnect(); process.exit(); });
process.on('SIGTERM', () => { subscriber.disconnect(); process.exit(); });
