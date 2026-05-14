const CACHE_NAME = 'podlearn-v2.3.0';
// Separate, persistent cache for user-initiated episode downloads. Lives across
// version bumps — only deleted when the user explicitly removes a download.
const OFFLINE_AUDIO_CACHE = 'podlearn-offline-audio-v1';
const STATIC_ASSETS = [
    '/manifest.json',
    '/icon.svg'
];

// Files that should always check network first (content that changes).
// /src/ files (main.js, audio.js, etc.) MUST stay network-first or a stale
// cached main.js will collide with a freshly deployed index.html — the JS
// references DOM ids that no longer exist and crashes init.
const NETWORK_FIRST = [
    '/index.html',
    '/pwa/index.html',
    '/podcasts.js',
    '/dist/podcasts.js',
    '/'
];

const NETWORK_FIRST_PREFIXES = [
    '/src/',
    '/dist/src/'
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
                    // Preserve the offline-audio cache across version bumps — it
                    // contains user-downloaded episodes that should outlive a deploy.
                    if (cacheName !== CACHE_NAME && cacheName !== OFFLINE_AUDIO_CACHE) {
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

    // For network-first resources (podcasts.js, root, /src/), try network first
    if (NETWORK_FIRST.some(path => url.pathname === path || url.pathname.endsWith(path))
        || NETWORK_FIRST_PREFIXES.some(prefix => url.pathname.includes(prefix))) {
        event.respondWith(networkFirst(event.request));
        return;
    }

    // Audio files: check the offline cache first (user-downloaded episodes),
    // then fall through to network. We never auto-cache audio into the
    // versioned cache to keep storage bounded — downloads are always
    // explicit and stored in OFFLINE_AUDIO_CACHE only.
    if (url.pathname.includes('/audio/')) {
        event.respondWith(audioFetch(event.request));
        return;
    }

    // For static assets, use cache first with network fallback
    event.respondWith(cacheFirst(event.request));
});

// Network first strategy - try network, fall back to cache
async function networkFirst(request, { cacheResponse = true } = {}) {
    try {
        const networkResponse = await fetch(request);
        if (cacheResponse && networkResponse.ok) {
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

// Audio fetch: serve from the offline cache when present (downloaded episode),
// otherwise stream from network without caching. Cache lookup ignores query
// strings so the per-load cache-buster (?v=…) never causes a miss.
async function audioFetch(request) {
    try {
        const cache = await caches.open(OFFLINE_AUDIO_CACHE);
        const cached = await cache.match(request, { ignoreSearch: true });
        if (cached) return cached;
    } catch (err) {
        console.warn('Offline audio cache lookup failed:', err);
    }
    return fetch(request);
}

// Listen for skip waiting message from client
self.addEventListener('message', event => {
    const data = event.data;
    if (data === 'SKIP_WAITING') {
        self.skipWaiting();
        return;
    }
    if (data === 'CLEAR_CACHE') {
        event.waitUntil(
            caches.delete(CACHE_NAME).then(() => {
                console.log('Cache cleared');
            })
        );
        return;
    }
    // Per-message offline-cache controls. Always reply via MessageChannel
    // (event.ports[0]) when one is provided so the client can await success.
    const reply = (payload) => {
        const port = event.ports && event.ports[0];
        if (port) port.postMessage(payload);
    };
    if (data && typeof data === 'object') {
        if (data.type === 'CACHE_AUDIO_URLS' && Array.isArray(data.urls)) {
            event.waitUntil((async () => {
                const cache = await caches.open(OFFLINE_AUDIO_CACHE);
                const results = [];
                for (const url of data.urls) {
                    try {
                        const res = await fetch(url, { cache: 'no-store' });
                        if (!res.ok) throw new Error(`HTTP ${res.status}`);
                        await cache.put(url, res.clone());
                        results.push({ url, ok: true });
                    } catch (err) {
                        results.push({ url, ok: false, error: String(err && err.message || err) });
                    }
                }
                reply({ type: 'CACHE_AUDIO_URLS_RESULT', results });
            })());
            return;
        }
        if (data.type === 'DELETE_AUDIO_URLS' && Array.isArray(data.urls)) {
            event.waitUntil((async () => {
                const cache = await caches.open(OFFLINE_AUDIO_CACHE);
                let removed = 0;
                for (const url of data.urls) {
                    if (await cache.delete(url, { ignoreSearch: true })) removed += 1;
                }
                reply({ type: 'DELETE_AUDIO_URLS_RESULT', removed });
            })());
            return;
        }
        if (data.type === 'LIST_OFFLINE_AUDIO') {
            event.waitUntil((async () => {
                const cache = await caches.open(OFFLINE_AUDIO_CACHE);
                const reqs = await cache.keys();
                reply({ type: 'LIST_OFFLINE_AUDIO_RESULT', urls: reqs.map((r) => r.url) });
            })());
            return;
        }
    }
});
