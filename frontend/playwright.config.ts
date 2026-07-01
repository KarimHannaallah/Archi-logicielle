import { defineConfig } from '@playwright/test';

const ENV = {
    JWT_SECRET: 'test-secret',
    REDIS_HOST: 'localhost',
    NODE_ENV: 'test',
};

const useDocker = process.env.USE_DOCKER_STACK === '1';

export default defineConfig({
    testDir: './e2e',
    timeout: 30_000,
    retries: 0,
    use: {
        baseURL: useDocker ? 'http://127.0.0.1' : 'http://localhost:5173',
        headless: true,
    },
    webServer: useDocker ? [] : [
        // 0. Redis
        {
            command: 'redis-server --port 6380 --daemonize no',
            port: 6380,
            timeout: 10_000,
            reuseExistingServer: true,
        },
        // 1. auth-service
        {
            command: [
                'npx cross-env',
                'USE_INMEMORY=true',
                `JWT_SECRET=${ENV.JWT_SECRET}`,
                'PORT=3001',
                'npx ts-node src/index.ts',
            ].join(' '),
            cwd: '../services/auth-service',
            port: 3001,
            timeout: 20_000,
            reuseExistingServer: true,
        },
        // 2. task-service
        {
            command: [
                'npx cross-env',
                'USE_INMEMORY=true',
                `JWT_SECRET=${ENV.JWT_SECRET}`,
                `REDIS_HOST=${ENV.REDIS_HOST}`,
                'REDIS_PORT=6380',
                'CORS_ORIGIN=http://localhost:5173',
                'AUTH_SERVICE_URL=http://localhost:3001',
                'PORT=3000',
                'npx ts-node src/index.ts',
            ].join(' '),
            cwd: '../services/task-service',
            port: 3000,
            timeout: 20_000,
            reuseExistingServer: true,
            env: { REDIS_PORT: '6380' },
        },
        // 3. project-service
        {
            command: [
                'npx cross-env',
                'USE_INMEMORY=true',
                `JWT_SECRET=${ENV.JWT_SECRET}`,
                `REDIS_HOST=${ENV.REDIS_HOST}`,
                'REDIS_PORT=6380',
                'AUTH_SERVICE_URL=http://localhost:3001',
                'PORT=3002',
                'npx ts-node src/index.ts',
            ].join(' '),
            cwd: '../services/project-service',
            port: 3002,
            timeout: 20_000,
            reuseExistingServer: true,
            env: { REDIS_PORT: '6380' },
        },
        // 4. notification-service
        {
            command: [
                'npx cross-env',
                `JWT_SECRET=${ENV.JWT_SECRET}`,
                `REDIS_HOST=${ENV.REDIS_HOST}`,
                'REDIS_PORT=6380',
                'AUTH_SERVICE_URL=http://localhost:3001',
                'PORT=3003',
                'npx ts-node src/index.ts',
            ].join(' '),
            cwd: '../services/notification-service',
            port: 3003,
            timeout: 20_000,
            reuseExistingServer: true,
            env: { REDIS_PORT: '6380' },
        },
        // 5. Vite dev server
        {
            command: 'npx vite --port 5173',
            port: 5173,
            timeout: 20_000,
            reuseExistingServer: true,
        },
    ],
});