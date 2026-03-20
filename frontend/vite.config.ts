import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    server: {
        port: 5173,
        proxy: {
            '/api/items': {
                target: 'http://localhost:3000',
                rewrite: (path) => path.replace(/^\/api/, ''),
            },
            '/api/auth': {
                target: 'http://localhost:3000',
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
