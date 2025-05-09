import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { VitePWA } from 'vite-plugin-pwa';

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
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.svg', 'robots.txt'],
            manifest: {
                name: 'SmashChats',
                short_name: 'Smash',
                start_url: '/',
                display: 'standalone',
                orientation: 'portrait-primary',
                background_color: '#000000',
                theme_color: '#000000',
                icons: [
                    {
                        src: '/favicon-32x32.png',
                        sizes: '32x32',
                        type: 'image/png',
                    },
                    {
                        src: '/favicon-96x96.png',
                        sizes: '96x96',
                        type: 'image/png',
                    },
                    {
                        src: '/favicon-192x192.png',
                        sizes: '192x192',
                        type: 'image/png',
                        purpose: 'any',
                    },
                    {
                        src: '/favicon-512x512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'any maskable',
                    },
                ],
                protocol_handlers: [
                    {
                        protocol: 'web+smash',
                        url: '/deep-link?q=%s',
                    },
                ],
                shortcuts: [
                    {
                        name: 'Camera',
                        short_name: 'Camera',
                        url: '/camera',
                        description: 'Take a photo',
                        icons: [
                            {
                                src: '/favicon-96x96.png',
                                sizes: '96x96',
                                type: 'image/png',
                            },
                        ],
                    },
                ],
            },
            devOptions: {
                enabled: true,
                type: 'module',
            },
        }),
    ],
    server: {
        host: true,
        hmr: {
            protocol: 'ws',
        },
    },
});
