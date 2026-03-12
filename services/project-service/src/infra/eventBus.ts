import Redis from 'ioredis';
import { v4 as uuid } from 'uuid';

export function createSubscriber(host: string, port: number) {
    const sub = new Redis({
        host,
        port,
        lazyConnect: true,
        retryStrategy: (times: number) => Math.min(times * 200, 3000),
        reconnectOnError: () => true,
    });
    sub.on('error', (err) => {
        console.error(`[${new Date().toISOString()}] [project-service] Redis subscriber error:`, err.message);
    });
    return sub;
}

export function createPublisher(host: string, port: number) {
    const pub = new Redis({
        host,
        port,
        lazyConnect: true,
        retryStrategy: (times: number) => Math.min(times * 200, 3000),
        reconnectOnError: () => true,
    });
    pub.connect().catch(() => {
        console.warn('[project-service] Redis publisher not available');
    });
    pub.on('error', (err) => {
        console.error(`[${new Date().toISOString()}] [project-service] Redis publisher error:`, err.message);
    });
    return pub;
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
        const subscribers = await publisher.publish(channel, JSON.stringify(event));
        console.log(`[${event.occurredAt}] PUBLISHED ${channel} | eventId=${event.eventId} | subscribers=${subscribers}`);
    } catch (err: any) {
        console.error(`[${new Date().toISOString()}] PUBLISH FAILED ${channel}:`, err.message);
    }
}