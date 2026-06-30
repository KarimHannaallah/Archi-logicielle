import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'fs';

const { version } = JSON.parse(readFileSync('./package.json', 'utf-8'));

export default defineConfig({
    plugins: [react()],
    define: {
        __APP_VERSION__: JSON.stringify(version),
    },
    server: {
        port: 5173,
        proxy: {
            '/api/items': {
                target: 'http://localhost:3000',
                rewrite: (path) => path.replace(/^\/api/, ''),
            },
            '/api/auth/v1': {
                target: 'http://localhost:3001',
                rewrite: (path) => path.replace(/^\/api\/auth\/v1/, '/v1/auth'),
            },
            '/api/auth': {
                target: 'http://localhost:3001',
                rewrite: (path) => path.replace(/^\/api/, ''),
            },
            '/api/projects': {
                target: 'http://localhost:3002',
                rewrite: (path) => path.replace(/^\/api/, ''),
            },
            '/api/notifications': {
                target: 'http://localhost:3003',
                rewrite: (path) => path.replace(/^\/api/, ''),
            },
        },
    },
});
