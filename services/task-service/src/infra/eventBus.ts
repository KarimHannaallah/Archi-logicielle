import Redis from 'ioredis';
import { v4 as uuid } from 'uuid';

const publisher = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    lazyConnect: true,
    retryStrategy: (times: number) => Math.min(times * 200, 3000),
});

publisher.connect().catch(() => {
    console.warn('[task-service] Redis not available — events will not be published');
});

export interface EventPublisher {
    publish(channel: string, payload: object): Promise<void>;
}

export function createEventPublisher(): EventPublisher {
    return {
        async publish(channel: string, payload: object): Promise<void> {
            try {
                const event = {
                    eventId: uuid(),
                    eventType: channel,
                    version: 1,
                    occurredAt: new Date().toISOString(),
                    ...payload,
                };
                await publisher.publish(channel, JSON.stringify(event));
                console.log(`[task-service] PUBLISHED ${channel} | eventId=${event.eventId}`);
            } catch (err) {
                console.error(`[task-service] Failed to publish ${channel}:`, err);
            }
        },
    };
}
