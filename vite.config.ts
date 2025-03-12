import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
    plugins: [
        react(),
        nodePolyfills({
            include: ['crypto', 'buffer', 'stream', 'util', 'events']
        })
    ],
    server: {
        host: true,
        hmr: {
            protocol: 'ws',
        },
    },
    resolve: {
        alias: {
            crypto: 'crypto-browserify',
            stream: 'stream-browserify',
            events: 'events',
        },
    },
    optimizeDeps: {
        include: [
            '@peculiar/webcrypto',
            'crypto-browserify',
            'stream-browserify',
            'util',
            '@protobufjs/inquire',
        ],
        force: true,
    },
    build: {
        target: 'esnext',
        commonjsOptions: {
            include: [/node_modules/],
            transformMixedEsModules: true,
        },
    },
});
