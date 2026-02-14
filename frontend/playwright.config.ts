import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: './e2e',
    timeout: 30000,
    retries: 0,
    use: {
        baseURL: 'http://localhost:5173',
        headless: true,
    },
    webServer: [
        {
            command: 'cd ../backend && USE_INMEMORY=true npx ts-node src/index.ts',
            port: 3000,
            timeout: 15000,
            reuseExistingServer: false,
            env: {
                NODE_ENV: 'test',
                USE_INMEMORY: 'true',
                JWT_SECRET: 'test-secret',
                CORS_ORIGIN: 'http://localhost:5173',
            },
        },
        {
            command: 'npx vite --port 5173',
            port: 5173,
            timeout: 15000,
            reuseExistingServer: false,
        },
    ],
});
