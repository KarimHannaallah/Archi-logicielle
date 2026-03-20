import { defineConfig } from '@playwright/test';

const ENV = {
    JWT_SECRET: 'test-secret',
    REDIS_HOST: 'localhost',
    NODE_ENV: 'test',
};

// Par défaut on démarre les serveurs locaux (Vite + ts-node + redis).
// Passer USE_DOCKER_STACK=1 pour pointer sur le stack Docker (nginx :80) sans démarrer de serveurs.
const useDocker = process.env.USE_DOCKER_STACK === '1';

export default defineConfig({
    testDir: './e2e',
    timeout: 30_000,
    retries: 0,
    use: {
        baseURL: useDocker ? 'http://localhost' : 'http://localhost:5173',
        headless: true,
    },
    webServer: useDocker ? [
        // In Docker mode there is no server to start — just wait for nginx to be ready.
        // reuseExistingServer: true means Playwright skips the command if http://localhost
        // already responds (which it always does when Docker is up).
        {
            url: 'http://localhost',
            reuseExistingServer: true,
            command: 'node -e "process.exit(0)"',
            timeout: 60_000,
        },
    ] : [
        // 0. Redis (needed for event bus between services)
        {
            command: 'redis-server --port 6380 --daemonize no',
            port: 6380,
            timeout: 10_000,
            reuseExistingServer: true,
        },
        // 1. task-service — exposes /items and /auth on :3000
        {
            command: [
                'npx cross-env',
                'USE_INMEMORY=true',
                `JWT_SECRET=${ENV.JWT_SECRET}`,
                `REDIS_HOST=${ENV.REDIS_HOST}`,
                'REDIS_PORT=6380',
                'CORS_ORIGIN=http://localhost:5173',
                'PORT=3000',
                'npx ts-node src/index.ts',
            ].join(' '),
            cwd: '../services/task-service',
            port: 3000,
            timeout: 20_000,
            reuseExistingServer: true,
            env: { REDIS_PORT: '6380' },
        },
        // 2. project-service — exposes /projects on :3002
        {
            command: [
                'npx cross-env',
                'USE_INMEMORY=true',
                `JWT_SECRET=${ENV.JWT_SECRET}`,
                `REDIS_HOST=${ENV.REDIS_HOST}`,
                'REDIS_PORT=6380',
                'PORT=3002',
                'npx ts-node src/index.ts',
            ].join(' '),
            cwd: '../services/project-service',
            port: 3002,
            timeout: 20_000,
            reuseExistingServer: true,
            env: { REDIS_PORT: '6380' },
        },
        // 3. notification-service — exposes /notifications on :3003
        {
            command: [
                'npx cross-env',
                `JWT_SECRET=${ENV.JWT_SECRET}`,
                `REDIS_HOST=${ENV.REDIS_HOST}`,
                'REDIS_PORT=6380',
                'PORT=3003',
                'npx ts-node src/index.ts',
            ].join(' '),
            cwd: '../services/notification-service',
            port: 3003,
            timeout: 20_000,
            reuseExistingServer: true,
            env: { REDIS_PORT: '6380' },
        },
        // 4. Vite dev server (frontend) — with proxies to all services
        {
            command: 'npx vite --port 5173',
            port: 5173,
            timeout: 20_000,
            reuseExistingServer: true,
        },
    ],
});
