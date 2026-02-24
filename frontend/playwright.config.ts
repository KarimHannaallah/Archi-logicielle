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
            command: 'npx cross-env USE_INMEMORY=true NODE_ENV=test JWT_SECRET=test-secret CORS_ORIGIN=http://localhost:5173 npx ts-node src/index.ts',
            cwd: '../backend',
            port: 3000,
            timeout: 15000,
            reuseExistingServer: false,
        },
        {
            command: 'npx vite --port 5173',
            port: 5173,
            timeout: 15000,
            reuseExistingServer: false,
        },
    ],
});
