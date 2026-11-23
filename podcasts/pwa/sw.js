// Service worker — atomic versioned precache.
//
// The build script substitutes __BUILD_VERSION__ and __APP_SHELL__ at deploy
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

const BUILD_VERSION = '__BUILD_VERSION__';
const APP_SHELL_RAW = __APP_SHELL__;

const SHELL_CACHE = `podlearn-shell-${BUILD_VERSION}`;
// Persistent across deploys — only deleted when the user explicitly removes
// a downloaded episode.
const OFFLINE_AUDIO_CACHE = 'podlearn-offline-audio-v1';
// Episode scripts fetched on open. Their URLs carry a content hash, so an
// entry stays valid across deploys until that script changes. Kept across
// deploys like the audio cache; small (tens of KB per episode).
const TRANSCRIPT_CACHE = 'podlearn-transcripts-v1';

const APP_SHELL = Array.isArray(APP_SHELL_RAW) ? APP_SHELL_RAW : [];
const SHELL_PATHS = new Set(APP_SHELL);

self.addEventListener('install', (event) => {
    console.log('[sw] install', BUILD_VERSION, 'shell entries:', APP_SHELL.length);
    event.waitUntil((async () => {
        if (APP_SHELL.length === 0) {
            // Dev / unsubstituted SW: skip precache; serve passthrough.
            return;
        }
        const cache = await caches.open(SHELL_CACHE);
        // `cache: 'reload'` forces each request past the browser HTTP cache so
        // we don't accidentally precache a stale main.js the browser is still
        // holding from the previous deploy.
        // addAll commits the entire batch or rejects installation. A new
        // worker waits for the Update action while an older client is open.
        await cache.addAll(APP_SHELL.map((url) => new Request(url, { cache: 'reload' })));
    })());
});

self.addEventListener('activate', (event) => {
    console.log('[sw] activate', BUILD_VERSION);
    event.waitUntil((async () => {
        const names = await caches.keys();
        await Promise.all(names.filter((name) => name.startsWith('podlearn-shell-') && name !== SHELL_CACHE)
            .map((name) => caches.delete(name)));
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

    // A saved recording keeps its script. Other transcripts use the current
    // catalog hash, then fall back to an older copy when offline.
    if (url.pathname.includes('/transcripts/')) {
        event.respondWith(transcriptFetch(req));
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

async function transcriptFetch(req) {
    const stores = await Promise.all([
        caches.open(TRANSCRIPT_CACHE),
        caches.open(OFFLINE_AUDIO_CACHE)
    ]).catch(() => []);
    const [transcripts, downloads] = stores;
    if (downloads) {
        const key = await pinnedManifestForScript(downloads, req.url);
        if (key) {
            const saved = await downloads.match(req, { ignoreSearch: true });
            const recorded = await readManifestTranscript(downloads, key);
            if (recorded) {
                // A 2.7.3 repair could pin a newer script alongside older audio.
                // Retain authored formatting only when its dialogue still lines
                // up with the saved recording, including every source line.
                const candidate = saved || await transcripts?.match(req, { ignoreSearch: true });
                if (candidate && sameRecordedDialogue(await candidate.clone().text(), recorded)) return candidate;
                return markdownResponse(recorded);
            }
            if (saved) return saved;
        }
    }
    if (transcripts) {
        const hit = await transcripts.match(req);
        if (hit) return hit;
    }
    try {
        const res = await fetch(req);
        if (res && res.ok) {
            if (stores[0]) {
                try {
                    const previous = await stores[0].keys(req, { ignoreSearch: true });
                    await stores[0].put(req, res.clone());
                    for (const key of previous) {
                        if (key.url !== req.url) await stores[0].delete(key);
                    }
                } catch (err) {
                    // Storage can be full. The network response still opens the
                    // episode, and a failed write leaves the previous script intact.
                    console.warn('[sw] could not cache transcript:', err.message);
                }
            }
            return res;
        }
        const stale = await offlineTranscript(stores, req);
        return stale || res;
    } catch (err) {
        const stale = await offlineTranscript(stores, req);
        if (stale) return stale;
        return new Response('Offline', { status: 503, statusText: 'Offline' });
    }
}

async function offlineTranscript(stores, req) {
    for (const cache of stores) {
        const hit = await cache.match(req, { ignoreSearch: true });
        if (hit) return hit;
    }
    return null;
}

function markdownResponse(markdown) {
    return new Response(markdown, { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
}

function recordedDialogue(markdown) {
    /*__DIALOGUE_PARSER__*/
    return parseMarkdown(markdown);
}

function sameRecordedDialogue(markdown, recorded) {
    const candidate = recordedDialogue(markdown);
    const expected = recordedDialogue(recorded);
    return candidate.length === expected.length && expected.every((line, i) =>
        candidate[i].rawLine === line.rawLine && candidate[i].speaker === line.speaker && candidate[i].text === line.text);
}

const manifestPath = /\/audio\/([^/]+)\/([^/]+)\/manifest\.json$/;
const combinedPath = /\/audio\/([^/]+)\/([^/]+)\/combined\.mp3$/;
const clipPath = /\/audio\/[^/]+\/[^/]+\/\d+\.(?:mp3|wav)$/;

function counterpartUrl(url) {
    const other = new URL(url);
    if (manifestPath.test(other.pathname)) other.pathname = other.pathname.replace(/manifest\.json$/, 'combined.mp3');
    else if (combinedPath.test(other.pathname)) other.pathname = other.pathname.replace(/combined\.mp3$/, 'manifest.json');
    else return null;
    return other.href;
}

function transcriptPath(manifestUrl) {
    const url = new URL(manifestUrl);
    return url.origin + url.pathname.replace(manifestPath, '/transcripts/$1/$2.md');
}

function pinnedManifestForScript(cache, scriptUrl) {
    const manifest = new URL(scriptUrl);
    const scriptPath = /\/transcripts\/([^/]+)\/([^/]+)\.md$/;
    if (!scriptPath.test(manifest.pathname)) return null;
    manifest.pathname = manifest.pathname.replace(scriptPath, '/audio/$1/$2/manifest.json');
    return pinnedAssetKey(cache, manifest);
}

// Probe keys only. Cache.match() on a combined MP3 can open a large response
// body even when the caller just needs to know whether its version is saved.
async function pinnedAssetKey(cache, url) {
    const counterpart = counterpartUrl(url);
    if (!counterpart) return null;
    const [candidates, peers] = await Promise.all([
        cache.keys(url.href, { ignoreSearch: true }),
        cache.keys(counterpart, { ignoreSearch: true })
    ]);
    const peerUrls = new Set(peers.map((req) => req.url));
    return candidates.reverse().find((req) => peerUrls.has(counterpartUrl(req.url)))?.url || null;
}

// Before transcripts moved out of the app shell, downloads saved only the MP3
// and its manifest. The manifest contains the recorded script, including the
// source line numbers the player uses to attach audio offsets and chapters.
async function readManifestTranscript(cache, key) {
    const response = await cache.match(key);
    if (!response) return null;
    const items = await response.json().catch(() => null);
    if (!Array.isArray(items)) return null;
    const lines = [];
    let chapter;
    let hasDialogue = false;
    for (const item of items) {
        if (!Number.isSafeInteger(item?.rawLine) || item.rawLine < lines.length || item.rawLine > 100000
            || typeof item.text !== 'string' || !item.text.trim() || /[\r\n]/.test(item.text)) return null;
        if (item.chapter && item.chapter !== chapter && item.rawLine > lines.length) {
            lines[item.rawLine - 1] = '### ' + item.chapter;
        }
        chapter = item.chapter;
        if (item.type === 'cue') {
            lines[item.rawLine] = item.text;
        } else {
            if (!/^[A-Z][A-Z0-9 '&()./-]*$/.test(item.speaker || '')) return null;
            lines[item.rawLine] = '**' + item.speaker + ':** ' + item.text;
            hasDialogue = true;
        }
    }
    return hasDialogue ? lines.join('\n') : null;
}

async function cachedAudio(cache, req, allowUnpaired = false) {
    const url = new URL(req.url);
    let key = (await cache.keys(req.url))[0]?.url || await pinnedAssetKey(cache, url);
    if (!key && allowUnpaired) key = (await cache.keys(req, { ignoreSearch: true }))[0]?.url;
    if (!key) return null;
    const range = req.headers.get('range')?.match(/^bytes=(\d*)-(\d*)$/);
    if (range && (range[1] || range[2]) && !manifestPath.test(url.pathname)) {
        const media = await savedRangeMedia(cache, key);
        return media && rangeAwareAudioResponse(range, media);
    }
    const response = await cache.match(key);
    if (!response) return null;
    if (manifestPath.test(url.pathname)) {
        const headers = new Headers(response.headers);
        headers.set('X-PodLearn-Audio-Cache-Key', new URL(key).searchParams.get('v') || '');
        return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
    }
    return response;
}

async function audioFetch(req) {
    const url = new URL(req.url);
    const retry = url.searchParams.has('podlearnRetry');
    const cache = await caches.open(OFFLINE_AUDIO_CACHE).catch(() => null);
    if (cache && !retry) {
        try {
            const saved = await cachedAudio(cache, req);
            if (saved) return saved;
        } catch (err) {
            console.warn('[sw] offline audio lookup failed:', err);
        }
    }
    let network;
    let networkError;
    try {
        network = retry ? await fetch(req, { cache: 'reload' }) : await fetch(req);
        if (network.ok) {
            // A cache-busting query does not identify an immutable recording
            // on the static host. Only use fresh bytes to repair a saved cut
            // if its validator or its published manifest still matches.
            if (retry && cache && combinedPath.test(url.pathname)) {
                const key = await pinnedAssetKey(cache, url);
                if (key && !await sameNetworkRecording(cache, key, network)) {
                    const saved = await cachedAudio(cache, req, true);
                    if (saved) {
                        void network.body?.cancel().catch(() => {});
                        return saved;
                    }
                }
            }
            // A failed combined recording can also trigger individual clip
            // playback. The same file number in a new cut may be different speech.
            if (cache && clipPath.test(url.pathname)) {
                const manifest = new URL(url);
                manifest.pathname = manifest.pathname.replace(/[^/]+$/, 'manifest.json');
                const key = await pinnedAssetKey(cache, manifest);
                if (key && !await sameNetworkManifest(cache, key)) {
                    void network.body?.cancel().catch(() => {});
                    return new Response('Recording revision changed', { status: 409 });
                }
            }
            return network;
        }
    } catch (err) {
        networkError = err;
    }
    if (cache) {
        const fallback = await cachedAudio(cache, req, true);
        if (fallback) return fallback;
    }
    if (networkError) throw networkError;
    return network;
}

async function sameNetworkRecording(cache, audioKey, network) {
    const etag = network.headers.get('etag');
    if (etag && !etag.startsWith('W/')) {
        const saved = await cache.match(audioKey);
        if (saved?.headers.get('etag') === etag) return true;
    }
    return sameNetworkManifest(cache, counterpartUrl(audioKey));
}

async function sameNetworkManifest(cache, key) {
    const savedManifest = await cache.match(key);
    if (!savedManifest) return false;
    const latest = await fetch(key, { cache: 'reload' }).catch(() => null);
    return Boolean(latest?.ok && await latest.text() === await savedManifest.text());
}

// Chrome may probe a recording and then issue overlapping seek requests.
// Share one in-flight read and keep at most one episode (up to 64 MiB) warm.
let rangeMedia = null;
function savedRangeMedia(cache, key) {
    if (rangeMedia?.key === key) return rangeMedia.media;
    const entry = { key };
    rangeMedia = entry;
    entry.media = (async () => {
        try {
            const response = await cache.match(key);
            if (!response) return null;
            const blob = await response.blob();
            if (blob.size <= 64 * 1024 * 1024) entry.reusable = true;
            return { blob, headers: response.headers };
        } finally {
            if (rangeMedia === entry && !entry.reusable) rangeMedia = null;
        }
    })();
    return entry.media;
}

function forgetRangeMedia(url) {
    if (rangeMedia && rangeMedia.key.split('?')[0] === url.split('?')[0]) rangeMedia = null;
}

function rangeAwareAudioResponse(match, { blob, headers: originalHeaders }) {
    const size = blob.size;
    let start;
    let end;

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
    const headers = new Headers(originalHeaders);
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

// Multiple tabs can download, remove, or reconcile at the same time. Only
// serialize cache access during the commit; the network transfers can overlap.
let audioCacheOperation = Promise.resolve();
function withAudioCache(operation) {
    const result = audioCacheOperation.then(async () => operation(await caches.open(OFFLINE_AUDIO_CACHE)));
    audioCacheOperation = result.catch(() => {});
    return result;
}

async function cacheEpisode(urls) {
    // Older clients backfill missing scripts with a single-file cache request.
    // Pin the recorded dialogue, never the script currently served by the host.
    if (urls.length === 1 && new URL(urls[0]).pathname.includes('/transcripts/')) {
        const [url] = urls;
        return withAudioCache(async cache => {
            const key = await pinnedManifestForScript(cache, url);
            const markdown = key && await readManifestTranscript(cache, key);
            if (!markdown) return [{ url, ok: false, error: 'Recorded transcript unavailable' }];
            if (!await cache.match(url, { ignoreSearch: true })) await cache.put(url, markdownResponse(markdown));
            return [{ url, ok: true }];
        });
    }
    const results = [];
    const fetched = [];
    for (const url of urls) {
        try {
            const res = await fetch(url, { cache: 'no-store' });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            fetched.push({ url, response: await validatedAudioCacheResponse(url, res) });
            results.push({ url, ok: true });
        } catch (err) {
            results.push({ url, ok: false, error: String(err.message || err) });
        }
    }
    if (results.some((r) => !r.ok)) return results;

    await withAudioCache(async (cache) => {
        const previous = await cache.keys();
        const existing = new Set(previous.map((request) => request.url));
        const added = [];
        try {
            for (const { url, response } of fetched) {
                // Exact keys are immutable content versions. Keep existing
                // entries available if the remaining files cannot fit.
                if (existing.has(url)) continue;
                await cache.put(url, response);
                forgetRangeMedia(url);
                added.push(url);
            }
        } catch (err) {
            await Promise.all(added.map((url) => cache.delete(url)));
            throw err;
        }
        // Retire old versions only after every new file is available.
        const current = new Set(urls);
        const paths = new Set(urls.map((url) => url.split('?')[0]));
        for (const { url } of previous) {
            if (!current.has(url) && paths.has(url.split('?')[0])) await cache.delete(url);
        }
    });
    return results;
}

// A v2.7.2 (or older) tab also sends DELETE_AUDIO_URLS on playback errors,
// containing only the failed MP3. Every shipped user-initiated Remove sends
// the episode's MP3 and manifest together, optionally followed by its script.
function isEpisodeRemoval(urls) {
    if (urls.length !== 2 && urls.length !== 3) return false;
    try {
        const [audio, manifest, script] = urls.map((value) => new URL(value));
        return audio.origin === self.location.origin && combinedPath.test(audio.pathname)
            && manifest.origin === audio.origin && manifest.pathname === new URL(counterpartUrl(audio)).pathname
            && (!script || script.origin + script.pathname === transcriptPath(manifest));
    } catch {
        return false;
    }
}

// A recovered script is generated on demand, so a full device can still play
// it. Validate only manifests whose original script is missing. Subsequent
// inventories of immutable, versioned manifests need only their cache keys.
const verifiedScriptManifests = new Set();
async function listDownloads(cache) {
    const urls = (await cache.keys()).map((request) => request.url);
    const transcriptUrls = (await (await caches.open(TRANSCRIPT_CACHE)).keys()).map((request) => request.url);
    const keys = new Set(urls);
    const paths = new Set([...urls, ...transcriptUrls].map((url) => url.split('?')[0]));
    const recoverableTranscriptUrls = new Set();
    for (const key of verifiedScriptManifests) {
        if (!keys.has(key)) verifiedScriptManifests.delete(key);
    }
    for (const key of urls) {
        const url = new URL(key);
        if (!manifestPath.test(url.pathname) || !keys.has(counterpartUrl(url))) continue;
        const script = transcriptPath(url);
        if (paths.has(script) || recoverableTranscriptUrls.has(script)) continue;
        if (verifiedScriptManifests.has(key) || await readManifestTranscript(cache, key)) {
            if (url.searchParams.has('v')) verifiedScriptManifests.add(key);
            recoverableTranscriptUrls.add(script);
        }
    }
    return { type: 'LIST_OFFLINE_AUDIO_RESULT', urls, transcriptUrls, recoverableTranscriptUrls: [...recoverableTranscriptUrls] };
}

self.addEventListener('message', (event) => {
    const data = event.data;
    if (data === 'SKIP_WAITING') {
        event.waitUntil(self.skipWaiting());
        return;
    }
    if (data === 'CLEAR_CACHE') {
        event.waitUntil((async () => {
            const names = await caches.keys();
            await Promise.all(names
                .filter((n) => n.startsWith('podlearn-shell-'))
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
            event.waitUntil(cacheEpisode(data.urls)
                .catch((err) => data.urls.map((url) => ({ url, ok: false, error: String(err.message || err) })))
                .then((results) => reply({ type: 'CACHE_AUDIO_URLS_RESULT', results })));
            return;
        }
        if (data.type === 'DELETE_AUDIO_URLS' && Array.isArray(data.urls)) {
            if (!isEpisodeRemoval(data.urls)) {
                reply({ type: 'DELETE_AUDIO_URLS_RESULT', removed: 0 });
                return;
            }
            event.waitUntil(withAudioCache(async (cache) => {
                let removed = 0;
                for (const url of data.urls) {
                    forgetRangeMedia(url);
                    if (await cache.delete(url, { ignoreSearch: true })) removed += 1;
                }
                reply({ type: 'DELETE_AUDIO_URLS_RESULT', removed });
            }).catch(() => reply({ type: 'DELETE_AUDIO_URLS_RESULT', error: 'Unable to remove download' })));
            return;
        }
        if (data.type === 'LIST_OFFLINE_AUDIO') {
            event.waitUntil(withAudioCache(listDownloads).then(reply)
                .catch(() => reply({ type: 'LIST_OFFLINE_AUDIO_RESULT', error: 'Unable to read downloads' })));
            return;
        }
    }
});
