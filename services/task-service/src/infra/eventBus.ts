import Redis from 'ioredis';
import { v4 as uuid } from 'uuid';

const publisher = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    lazyConnect: true,
    retryStrategy: (times) => Math.min(times * 200, 3000),
    reconnectOnError: (err) => {
        console.warn(`[task-service] Redis reconnect triggered: ${err.message}`);
        return true;
    },
});

publisher.on('connect', () => console.log('[task-service] Redis publisher connected'));
publisher.on('ready', () => console.log('[task-service] Redis publisher ready'));
publisher.on('error', (err) => {
    console.warn(`[task-service] Redis publisher error: ${err.message}`);
});
publisher.on('reconnecting', () => console.log('[task-service] Redis publisher reconnecting...'));

export async function publishEvent(channel: string, payload: object): Promise<void> {
    const event = {
        eventId: uuid(),
        eventType: channel,
        version: 1,
        occurredAt: new Date().toISOString(),
        ...payload,
    };
    try {
        const subscribers = await publisher.publish(channel, JSON.stringify(event));
        console.log(
            `[task-service] [${event.occurredAt}] PUBLISHED ${channel} | eventId=${event.eventId} | subscribers=${subscribers}`,
        );
    } catch (err: any) {
        console.warn(`[task-service] Could not publish ${channel} (eventId=${event.eventId}): ${err.message}`);
    }
}
