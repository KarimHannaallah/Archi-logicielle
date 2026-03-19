import Redis from 'ioredis';
import { v4 as uuid } from 'uuid';
import { createApp } from './app';
import { addNotification } from './store/notificationStore';
import type { Notification } from './domain/Notification';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';

function createInternalToken(userId: string): string {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '1m' });
}

// --- Redis subscriber ---
const subscriber = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    lazyConnect: true,
    retryStrategy: (times: number) => Math.min(times * 200, 3000),
    reconnectOnError: () => true,
});

const CHANNELS = ['TaskCompleted', 'TaskReopened', 'ProjectClosed', 'TaskDeleted'];
const processedEvents = new Set<string>();

function buildMessage(channel: string, projectId: string): string {
    switch (channel) {
        case 'TaskCompleted': return `Tâche terminée dans le projet ${projectId}`;
        case 'TaskReopened': return `Tâche réouverte dans le projet ${projectId}`;
        case 'ProjectClosed': return `Projet ${projectId} terminé ! Toutes les tâches sont complétées.`;
        case 'TaskDeleted': return `Tâche supprimée dans le projet ${projectId}`;
        default: return `Événement ${channel}`;
    }
}

subscriber.connect()
    .then(() => subscriber.subscribe(...CHANNELS))
    .then(() => console.log(`[notification-service] Subscribed to: ${CHANNELS.join(', ')}`))
    .catch((err) => console.warn('[notification-service] Redis not available:', err.message));

subscriber.on('message', async (channel: string, message: string) => {
    try {
        const event = JSON.parse(message);

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

        // Fetcher le nom du projet depuis le project-service
        let projectName = event.projectId;
        try {
            const res = await fetch(`http://${process.env.PROJECT_SERVICE_HOST || 'localhost'}:${process.env.PROJECT_SERVICE_PORT || '3002'}/projects/${event.projectId}`, {
                headers: { 'Authorization': `Bearer ${createInternalToken(event.userId)}` },
            });
            if (res.ok) {
                const project = await res.json() as { name: string };
                projectName = project.name;
            }
        } catch { /* fallback to projectId */ }

        function buildMessage(ch: string): string {
            switch (ch) {
                case 'TaskCompleted': return `Tâche terminée dans "${projectName}"`;
                case 'TaskReopened': return `Tâche réouverte dans "${projectName}"`;
                case 'ProjectClosed': return `Projet "${projectName}" terminé ! Toutes les tâches sont complétées.`;
                case 'TaskDeleted': return `Tâche supprimée dans "${projectName}"`;
                default: return `Événement ${ch}`;
            }
        }

        const notification: Notification = {
            id: uuid(),
            eventType: channel,
            eventId: event.eventId,
            message: buildMessage(channel),
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
