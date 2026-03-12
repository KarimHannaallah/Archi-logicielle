import Redis from 'ioredis';
import { v4 as uuid } from 'uuid';

const publisher = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    lazyConnect: true,
    retryStrategy: (times: number) => Math.min(times * 200, 3000),
    reconnectOnError: () => true,
});

publisher.connect().catch(() => {
    console.warn('[task-service] Redis not available — events will not be published');
});

publisher.on('error', (err) => {
    console.error(`[${new Date().toISOString()}] [task-service] Redis error:`, err.message);
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
                const subscribers = await publisher.publish(channel, JSON.stringify(event));
                console.log(`[${event.occurredAt}] PUBLISHED ${channel} | eventId=${event.eventId} | subscribers=${subscribers}`);
            } catch (err: any) {
                console.error(`[${new Date().toISOString()}] PUBLISH FAILED ${channel}:`, err.message);
            }
        },
    };
}
