const CACHE_NAME = 'podlearn-v14';
const STATIC_ASSETS = [
    '/index.html',
    '/manifest.json',
    '/icon.svg'
];

// Files that should always check network first (content that changes)
const NETWORK_FIRST = [
    '/podcasts.js',
    '/'
];

// Install service worker
self.addEventListener('install', event => {
    console.log('Service Worker installing, version:', CACHE_NAME);
    // Skip waiting to activate immediately
    self.skipWaiting();
});

// Activate and clean up old caches
self.addEventListener('activate', event => {
    console.log('Service Worker activating, version:', CACHE_NAME);
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            // Take control of all clients immediately
            return self.clients.claim();
        }).then(() => {
            // Notify all clients that SW has updated
            return self.clients.matchAll().then(clients => {
                clients.forEach(client => {
                    client.postMessage({ type: 'SW_UPDATED', version: CACHE_NAME });
                });
            });
        })
    );
});

// Smart fetch strategy
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // NEVER cache version.json - always go to network
    if (url.pathname.endsWith('version.json')) {
        event.respondWith(fetch(event.request));
        return;
    }

    // For network-first resources (podcasts.js, root), try network first
    if (NETWORK_FIRST.some(path => url.pathname === path || url.pathname.endsWith(path))) {
        event.respondWith(networkFirst(event.request));
        return;
    }

    // For audio files, use network with cache fallback
    if (url.pathname.startsWith('/audio/')) {
        event.respondWith(networkFirst(event.request));
        return;
    }

    // For static assets, use cache first with network fallback
    event.respondWith(cacheFirst(event.request));
});

// Network first strategy - try network, fall back to cache
async function networkFirst(request) {
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            // Cache the fresh response
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        // Network failed, try cache
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        throw error;
    }
}

// Cache first strategy - try cache, fall back to network
async function cacheFirst(request) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
        return cachedResponse;
    }

    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        // Return a basic offline page or error
        return new Response('Offline', { status: 503, statusText: 'Offline' });
    }
}

// Listen for skip waiting message from client
self.addEventListener('message', event => {
    if (event.data === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    if (event.data === 'CLEAR_CACHE') {
        event.waitUntil(
            caches.delete(CACHE_NAME).then(() => {
                console.log('Cache cleared');
            })
        );
    }
});
