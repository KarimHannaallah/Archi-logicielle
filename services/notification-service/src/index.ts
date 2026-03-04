import Redis from 'ioredis';

const subscriber = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: 6379,
});

const CHANNELS = ['TaskCompleted', 'TaskReopened', 'ProjectClosed'];

async function main() {
    await subscriber.subscribe(...CHANNELS);
    console.log(`[notification-service] Subscribed to: ${CHANNELS.join(', ')}`);

    subscriber.on('message', (channel, message) => {
        const event = JSON.parse(message);
        console.log(`[notification-service] ${channel}:`, event);
        // TODO: stocker en base + endpoint /notifications
    });
}

main().catch(console.error);
