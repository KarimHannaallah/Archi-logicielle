import Redis from 'ioredis';
import { v4 as uuid } from 'uuid';

export function createSubscriber(host: string, port: number) {
    return new Redis({
        host,
        port,
        lazyConnect: true,
        retryStrategy: (times: number) => Math.min(times * 200, 3000),
    });
}

export function createPublisher(host: string, port: number) {
    const publisher = new Redis({
        host,
        port,
        lazyConnect: true,
        retryStrategy: (times: number) => Math.min(times * 200, 3000),
    });
    publisher.connect().catch(() => {
        console.warn('[project-service] Redis publisher not available');
    });
    return publisher;
}

export async function publishEvent(publisher: Redis, channel: string, payload: object): Promise<void> {
    try {
        const event = {
            eventId: uuid(),
            eventType: channel,
            version: 1,
            occurredAt: new Date().toISOString(),
            ...payload,
        };
        await publisher.publish(channel, JSON.stringify(event));
        console.log(`[project-service] PUBLISHED ${channel} | eventId=${event.eventId}`);
    } catch (err) {
        console.error(`[project-service] Failed to publish ${channel}:`, err);
    }
}