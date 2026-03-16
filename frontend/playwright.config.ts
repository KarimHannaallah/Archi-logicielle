import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: './e2e',
    timeout: 60000,
    expect: { timeout: 10000 },
    use: {
        baseURL: 'http://localhost:5173',
        headless: true,
    },
    webServer: [
        {
            command: 'docker run --rm -p 6380:6379 redis:7-alpine',
            port: 6380,
            reuseExistingServer: true,
        },
        {
            command: 'npx ts-node src/index.ts',
            cwd: '../services/task-service',
            port: 3000,
            reuseExistingServer: true,
            env: {
                USE_INMEMORY: 'true',
                REDIS_HOST: 'localhost',
                REDIS_PORT: '6380',
                JWT_SECRET: 'change-me-in-production',
                CORS_ORIGIN: 'http://localhost:5173',
                PORT: '3000',
            },
        },
        {
            command: 'npx ts-node src/index.ts',
            cwd: '../services/project-service',
            port: 3002,
            reuseExistingServer: true,
            env: {
                USE_INMEMORY: 'true',
                REDIS_HOST: 'localhost',
                REDIS_PORT: '6380',
                JWT_SECRET: 'change-me-in-production',
                PORT: '3002',
            },
        },
        {
            command: 'npx ts-node src/index.ts',
            cwd: '../services/notification-service',
            port: 3003,
            reuseExistingServer: true,
            env: {
                REDIS_HOST: 'localhost',
                REDIS_PORT: '6380',
                JWT_SECRET: 'change-me-in-production',
                PORT: '3003',
            },
        },
        {
            command: 'npx vite --port 5173',
            port: 5173,
            reuseExistingServer: true,
        },
    ],
});
