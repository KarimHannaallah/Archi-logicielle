import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    server: {
        port: 5173,
        proxy: {
            '/items': 'http://localhost:3000',
            '/auth': 'http://localhost:3000',
            '/projects': {
                target: 'http://localhost:3002',
                bypass(req) {
                    if (req.headers.accept?.includes('text/html')) {
                        return req.url;
                    }
                },
            },
            '/notifications': 'http://localhost:3003',
        },
    },
});