// Service worker — atomic versioned precache.
//
// The build script substitutes 2.3.0+20260810T220215Z and ["/icon-192.png","/icon-512.png","/icon-maskable-192.png","/icon-maskable-512.png","/icon.svg","/index.html","/manifest.json","/podcasts.js","/src/app/back-nav.js","/src/app/podcasts-loader.js","/src/app/version.js","/src/app/wake-lock.js","/src/downloads/downloads.js","/src/main.js","/src/parse/dialogue.js","/src/playback/audio-errors.js","/src/playback/audio.js","/src/playback/chapters.js","/src/playback/controller.js","/src/playback/manifest.js","/src/playback/media-session.js","/src/playback/sleep-controller.js","/src/playback/sleep-timer.js","/src/playback/visualizer.js","/src/search/transcript-search.js","/src/security/sanitize.js","/src/share-export/export.js","/src/state/queue-next.js","/src/state/speed-prefs.js","/src/state/stats.js","/src/state/storage.js","/src/sw/register-sw.js","/src/ui/artwork.js","/src/ui/bookmarks-panel.js","/src/ui/chapters-panel.js","/src/ui/dom.js","/src/ui/format.js","/src/ui/library.js","/src/ui/long-press.js","/src/ui/mini-player.js","/src/ui/modal-a11y.js","/src/ui/motion.js","/src/ui/queue-panel.js","/src/ui/render.js","/src/ui/scrubber.js","/src/ui/settings-panel.js","/src/ui/share-panel.js","/src/ui/shortcuts.js","/src/ui/swipe.js","/src/ui/tabs.js","/src/ui/toast.js","/src/ui/transcript-follow.js","/src/ui/transcript-panel.js","/styles/base.css","/styles/components.css","/styles/player.css"] at deploy
// time. Each deploy gets a unique cache name and pre-fetches the entire app
// shell during install. Activation atomically deletes any older shell cache
// (preserving the user-downloaded audio cache). After activation + clients.claim,
// every request for an app-shell URL is served from a self-consistent set of
// files — never a freshly deployed index.html paired with an old main.js.
//
// At dev time (when running directly without the build) the substitution
// hasn't happened, so we fall back to a placeholder version and an empty
// shell list, which means precache is skipped and the SW just passes
// requests through to the network. Audio downloads still work.

const BUILD_VERSION = '2.3.0+20260810T220215Z';
const APP_SHELL_RAW = ["/icon-192.png","/icon-512.png","/icon-maskable-192.png","/icon-maskable-512.png","/icon.svg","/index.html","/manifest.json","/podcasts.js","/src/app/back-nav.js","/src/app/podcasts-loader.js","/src/app/version.js","/src/app/wake-lock.js","/src/downloads/downloads.js","/src/main.js","/src/parse/dialogue.js","/src/playback/audio-errors.js","/src/playback/audio.js","/src/playback/chapters.js","/src/playback/controller.js","/src/playback/manifest.js","/src/playback/media-session.js","/src/playback/sleep-controller.js","/src/playback/sleep-timer.js","/src/playback/visualizer.js","/src/search/transcript-search.js","/src/security/sanitize.js","/src/share-export/export.js","/src/state/queue-next.js","/src/state/speed-prefs.js","/src/state/stats.js","/src/state/storage.js","/src/sw/register-sw.js","/src/ui/artwork.js","/src/ui/bookmarks-panel.js","/src/ui/chapters-panel.js","/src/ui/dom.js","/src/ui/format.js","/src/ui/library.js","/src/ui/long-press.js","/src/ui/mini-player.js","/src/ui/modal-a11y.js","/src/ui/motion.js","/src/ui/queue-panel.js","/src/ui/render.js","/src/ui/scrubber.js","/src/ui/settings-panel.js","/src/ui/share-panel.js","/src/ui/shortcuts.js","/src/ui/swipe.js","/src/ui/tabs.js","/src/ui/toast.js","/src/ui/transcript-follow.js","/src/ui/transcript-panel.js","/styles/base.css","/styles/components.css","/styles/player.css"];

const SHELL_CACHE = `podlearn-shell-${BUILD_VERSION}`;
// Persistent across deploys — only deleted when the user explicitly removes
// a downloaded episode.
const OFFLINE_AUDIO_CACHE = 'podlearn-offline-audio-v1';

const APP_SHELL = Array.isArray(APP_SHELL_RAW) ? APP_SHELL_RAW : [];
const SHELL_PATHS = new Set(APP_SHELL);

self.addEventListener('install', (event) => {
    console.log('[sw] install', BUILD_VERSION, 'shell entries:', APP_SHELL.length);
    event.waitUntil((async () => {
        if (APP_SHELL.length === 0) {
            // Dev / unsubstituted SW: skip precache; serve passthrough.
            return self.skipWaiting();
        }
        const cache = await caches.open(SHELL_CACHE);
        // `cache: 'reload'` forces each request past the browser HTTP cache so
        // we don't accidentally precache a stale main.js the browser is still
        // holding from the previous deploy.
        await Promise.all(APP_SHELL.map((url) => {
            const req = new Request(url, { cache: 'reload' });
            return fetch(req).then((res) => {
                if (!res || !res.ok) throw new Error(`Precache fetch failed: ${url} (${res && res.status})`);
                return cache.put(url, res);
            }).catch((err) => {
                console.warn('[sw] precache miss:', url, err.message);
            });
        }));
        return self.skipWaiting();
    })());
});

self.addEventListener('activate', (event) => {
    console.log('[sw] activate', BUILD_VERSION);
    event.waitUntil((async () => {
        const keep = new Set([SHELL_CACHE, OFFLINE_AUDIO_CACHE]);
        const names = await caches.keys();
        await Promise.all(names.map((name) => keep.has(name) ? null : caches.delete(name)));
        await self.clients.claim();
        const clients = await self.clients.matchAll();
        clients.forEach((client) => client.postMessage({ type: 'SW_UPDATED', version: BUILD_VERSION }));
    })());
});

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;

    const url = new URL(req.url);
    if (url.origin !== self.location.origin) return; // only intercept same-origin

    // version.json: always fresh from network so the version-mismatch detection
    // in the page can fire. No caching, no shell membership.
    if (url.pathname.endsWith('/version.json') || url.pathname.endsWith('version.json')) {
        // Offline this fetch rejects, and an unhandled rejection in
        // respondWith surfaces as a hard network error in the page. There is
        // no new version to discover without a network, so answer with a shape
        // the caller can simply fail to parse.
        event.respondWith(fetch(req).catch(() => new Response('{}', {
            status: 503,
            statusText: 'Offline',
            headers: { 'Content-Type': 'application/json' }
        })));
        return;
    }

    // Audio: serve user-downloaded episodes from the offline cache, otherwise
    // stream from network. Never auto-cache so storage stays bounded.
    if (url.pathname.includes('/audio/')) {
        event.respondWith(audioFetch(req));
        return;
    }

    // App shell: serve from the current shell cache. Each deploy has its own
    // cache, so the shell is always internally consistent.
    if (isShellRequest(url, req)) {
        event.respondWith(shellFetch(req));
        return;
    }

    // Anything else (e.g. third-party scripts): pass through to network.
});

function isShellRequest(url, req) {
    if (SHELL_PATHS.has(url.pathname)) return true;
    // Root path serves index.html in production hosting.
    if (url.pathname === '/' && SHELL_PATHS.has('/index.html')) return true;
    // Any navigation belongs to the shell: this is a single-route app, so a
    // document request that isn't a precached path is still answerable by
    // index.html rather than by failing at the network.
    if (req && req.mode === 'navigate' && SHELL_PATHS.has('/index.html')) return true;
    return false;
}

// A navigation to "/" is a different cache key than the "/index.html" the
// precache stored, so matching the request alone can never satisfy the one
// request every cold start begins with — and start_url is "/", so that is
// exactly how the installed app launches. Offline it fell through to the
// network and got a 503, which is why downloaded episodes looked like they had
// vanished: the app was never getting far enough to look for them.
async function shellFetch(req) {
    const cache = await caches.open(SHELL_CACHE);
    const cached = await cache.match(req, { ignoreSearch: true });
    if (cached) return cached;
    const documentFallback = await matchDocumentFallback(cache, req);
    if (documentFallback) return documentFallback;
    // Cache miss (e.g. dev mode where precache was skipped, or a file that
    // wasn't in the manifest at build time): fall back to network and store
    // it so subsequent loads are fast.
    try {
        const res = await fetch(req);
        if (res && res.ok) cache.put(req, res.clone()).catch(() => {});
        return res;
    } catch (err) {
        return new Response('Offline', { status: 503, statusText: 'Offline' });
    }
}

// Any request for a document — the root, or a deep link the SPA would have
// routed itself — is answered by the cached shell.
async function matchDocumentFallback(cache, req) {
    const isDocument = req.mode === 'navigate'
        || new URL(req.url).pathname === '/'
        || (req.headers.get('accept') || '').includes('text/html');
    if (!isDocument) return null;
    return (await cache.match('/index.html', { ignoreSearch: true })) || null;
}

async function audioFetch(req) {
    let cache = null;
    try {
        cache = await caches.open(OFFLINE_AUDIO_CACHE);
        const cached = await cache.match(req);
        if (cached) return rangeAwareAudioResponse(req, cached);
    } catch (err) {
        console.warn('[sw] offline audio lookup failed:', err);
    }

    try {
        const network = await fetch(req);
        if (network && network.ok) return network;
        // fetch() resolves for HTTP failures. Treat a transient 4xx/5xx like
        // an offline network error so a user-downloaded episode remains
        // playable; valid audio range responses (206) are `ok` and return
        // above.
        if (cache) {
            const cachedFallback = await cache.match(req, { ignoreSearch: true });
            if (cachedFallback) {
                console.warn('[sw] using downloaded audio after network HTTP failure:', req.url, network?.status);
                return rangeAwareAudioResponse(req, cachedFallback);
            }
        }
        return network;
    } catch (err) {
        if (cache) {
            const cachedFallback = await cache.match(req, { ignoreSearch: true });
            if (cachedFallback) {
                console.warn('[sw] using older offline audio after network failure:', req.url);
                return rangeAwareAudioResponse(req, cachedFallback);
            }
        }
        throw err;
    }
}

async function rangeAwareAudioResponse(req, cached) {
    const range = req.headers.get('range');
    if (!range) return cached;

    const match = range.match(/^bytes=(\d*)-(\d*)$/);
    if (!match) return cached;

    const blob = await cached.blob();
    const size = blob.size;
    let start;
    let end;

    if (match[1] === '' && match[2] === '') {
        return cached;
    }

    if (match[1] === '') {
        const suffixLength = Number(match[2]);
        if (!Number.isFinite(suffixLength) || suffixLength <= 0) {
            return rangeNotSatisfiable(size);
        }
        start = Math.max(0, size - suffixLength);
        end = size - 1;
    } else {
        start = Number(match[1]);
        end = match[2] === '' ? size - 1 : Number(match[2]);
    }

    if (
        !Number.isFinite(start) ||
        !Number.isFinite(end) ||
        start < 0 ||
        end < start ||
        start >= size
    ) {
        return rangeNotSatisfiable(size);
    }

    end = Math.min(end, size - 1);
    const body = blob.slice(start, end + 1);
    const headers = new Headers(cached.headers);
    headers.set('Accept-Ranges', 'bytes');
    headers.set('Content-Length', String(body.size));
    headers.set('Content-Range', `bytes ${start}-${end}/${size}`);
    if (!headers.has('Content-Type')) {
        headers.set('Content-Type', blob.type || 'audio/mpeg');
    }

    return new Response(body, {
        status: 206,
        statusText: 'Partial Content',
        headers
    });
}

function rangeNotSatisfiable(size) {
    return new Response('', {
        status: 416,
        statusText: 'Range Not Satisfiable',
        headers: {
            'Content-Range': `bytes */${size}`,
            'Accept-Ranges': 'bytes'
        }
    });
}

async function validatedAudioCacheResponse(url, res) {
    if (res.status === 206) {
        throw new Error('Refusing to cache partial audio response');
    }
    const blob = await res.blob();
    // Content-Length describes the bytes *on the wire*. When the server applies
    // a transfer compression (Netlify brotli-encodes manifest.json), the browser
    // transparently inflates the body but leaves the original header in place,
    // so blob.size is the decompressed size and comparing the two reports a
    // perfectly good download as truncated. Only trust the header when the body
    // reached us unencoded.
    const encoding = (res.headers.get('content-encoding') || '').trim().toLowerCase();
    const wasCompressed = encoding !== '' && encoding !== 'identity';
    const expectedLength = Number(res.headers.get('content-length'));
    if (!wasCompressed && Number.isFinite(expectedLength) && expectedLength > 0 && blob.size !== expectedLength) {
        throw new Error(`Incomplete response (${blob.size}/${expectedLength} bytes)`);
    }
    if (url.includes('/combined.mp3') && blob.size <= 0) {
        throw new Error('Empty audio response');
    }
    // `blob` holds the decoded bytes, so the transfer headers that described the
    // encoded body no longer apply. Leaving them on the cached entry would claim
    // an encoding that is already undone and a length that disagrees with the
    // body — which rangeAwareAudioResponse would then copy onto its 206s.
    const headers = new Headers(res.headers);
    if (wasCompressed) {
        headers.delete('content-encoding');
    }
    headers.set('Content-Length', String(blob.size));
    return new Response(blob, {
        status: res.status,
        statusText: res.statusText,
        headers
    });
}

self.addEventListener('message', (event) => {
    const data = event.data;
    if (data === 'SKIP_WAITING') {
        self.skipWaiting();
        return;
    }
    if (data === 'CLEAR_CACHE') {
        event.waitUntil((async () => {
            const names = await caches.keys();
            await Promise.all(names
                .filter((n) => n !== OFFLINE_AUDIO_CACHE)
                .map((n) => caches.delete(n)));
        })());
        return;
    }
    const reply = (payload) => {
        const port = event.ports && event.ports[0];
        if (port) port.postMessage(payload);
    };
    if (data && typeof data === 'object') {
        if (data.type === 'CACHE_AUDIO_URLS' && Array.isArray(data.urls)) {
            event.waitUntil((async () => {
                const cache = await caches.open(OFFLINE_AUDIO_CACHE);
                const results = [];
                const fetched = [];
                for (const url of data.urls) {
                    try {
                        const res = await fetch(url, { cache: 'no-store' });
                        if (!res.ok) throw new Error(`HTTP ${res.status}`);
                        const stored = await validatedAudioCacheResponse(url, res);
                        fetched.push({ url, response: stored });
                        results.push({ url, ok: true });
                    } catch (err) {
                        results.push({ url, ok: false, error: String(err && err.message || err) });
                    }
                }
                if (results.every((r) => r.ok)) {
                    for (const item of fetched) {
                        await cache.delete(item.url, { ignoreSearch: true });
                        await cache.put(item.url, item.response);
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
