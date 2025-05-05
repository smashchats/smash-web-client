// Service Worker for Smashchats PWA
const CACHE_NAME = 'smashchats-cache-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/manifest.json',
    '/favicon-32x32.png',
    '/favicon-96x96.png',
    '/favicon-192x192.png',
    '/favicon-512x512.png',
];

// Install event - cache assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches
            .open(CACHE_NAME)
            .then((cache) => {
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(() => {
                return self.skipWaiting();
            }),
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME) {
                            return caches.delete(cacheName);
                        }
                    }),
                );
            })
            .then(() => {
                return self.clients.claim();
            }),
    );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            // Return cached response if found
            if (response) {
                return response;
            }

            // Clone the request to avoid consuming it
            const fetchRequest = event.request.clone();

            // Try network request
            return fetch(fetchRequest)
                .then((response) => {
                    // Check if valid response
                    if (
                        !response ||
                        response.status !== 200 ||
                        response.type !== 'basic'
                    ) {
                        return response;
                    }

                    // Clone the response to cache it and return it
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });

                    return response;
                })
                .catch(() => {
                    // Return offline fallback page for navigation requests
                    if (event.request.mode === 'navigate') {
                        return caches.match('/');
                    }
                    // For non-navigation requests, return an empty response
                    return new Response();
                });
        }),
    );
});
