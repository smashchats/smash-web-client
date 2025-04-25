import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
    plugins: [
        react(),
        nodePolyfills({
            include: ['crypto', 'buffer', 'stream', 'util', 'events'],
            globals: {
                Buffer: true,
                global: true,
                process: true,
            },
        }),
        tailwindcss(),
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
        exclude: [
            'vite-plugin-node-polyfills/shims/buffer',
            'vite-plugin-node-polyfills/shims/global',
            'vite-plugin-node-polyfills/shims/process',
        ],
        force: true,
    },
    build: {
        target: 'esnext',
        commonjsOptions: {
            include: [/node_modules/],
            transformMixedEsModules: true,
        },
        rollupOptions: {
            output: {
                manualChunks: {
                    'react-vendor': ['react', 'react-dom'],
                    'smash-lib': ['smash-node-lib'],
                    'ui-components': ['lucide-react'],
                    'crypto-vendor': [
                        'crypto-browserify',
                        '@peculiar/webcrypto',
                    ],
                    'stream-vendor': ['stream-browserify', 'events'],
                    'protobuf-vendor': ['@protobufjs/inquire'],
                },
            },
        },
        chunkSizeWarningLimit: 1000,
    },
});
