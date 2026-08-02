import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadServiceWorker({ fetchImpl, cacheImpl }) {
  const source = fs.readFileSync(path.join(__dirname, '../../sw.js'), 'utf8')
    .replace('const APP_SHELL_RAW = __APP_SHELL__;', 'const APP_SHELL_RAW = [];');
  const listeners = new Map();
  const context = {
    console,
    URL,
    Request,
    Response,
    Headers,
    Blob,
    fetch: fetchImpl,
    caches: {
      open: async () => cacheImpl,
      keys: async () => [],
      delete: async () => true
    },
    self: {
      location: { origin: 'https://example.test' },
      addEventListener: (event, handler) => listeners.set(event, handler),
      skipWaiting: async () => {},
      clients: { claim: async () => {}, matchAll: async () => [] }
    }
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  return { context, listeners };
}

function createCache(initial = []) {
  const entries = new Map(initial);
  const requestUrl = (req) => typeof req === 'string' ? req : req.url;
  return {
    entries,
    async match(req, options = {}) {
      const url = requestUrl(req);
      if (!options.ignoreSearch) return entries.get(url) || undefined;
      const wanted = new URL(url);
      for (const [key, response] of entries) {
        const cached = new URL(key);
        if (cached.origin === wanted.origin && cached.pathname === wanted.pathname) {
          return response;
        }
      }
      return undefined;
    },
    async put(req, response) {
      entries.set(requestUrl(req), response);
    },
    async delete(req, options = {}) {
      const url = requestUrl(req);
      if (!options.ignoreSearch) return entries.delete(url);
      const wanted = new URL(url);
      let removed = false;
      for (const key of [...entries.keys()]) {
        const cached = new URL(key);
        if (cached.origin === wanted.origin && cached.pathname === wanted.pathname) {
          removed = entries.delete(key) || removed;
        }
      }
      return removed;
    },
    async keys() {
      return [...entries.keys()].map((url) => new Request(url));
    }
  };
}

test('audioFetch uses network before stale ignoreSearch audio cache entries', async () => {
  const staleUrl = 'https://example.test/audio/show/ep/combined.mp3';
  const requestedUrl = `${staleUrl}?v=new`;
  const cache = createCache([[staleUrl, new Response('stale-audio')]]);
  const { context } = loadServiceWorker({
    cacheImpl: cache,
    fetchImpl: async () => new Response('fresh-audio')
  });

  const response = await context.audioFetch(new Request(requestedUrl));

  assert.equal(await response.text(), 'fresh-audio');
});

test('audioFetch serves exact versioned offline cache hits', async () => {
  const requestedUrl = 'https://example.test/audio/show/ep/combined.mp3?v=current';
  const cache = createCache([[requestedUrl, new Response('cached-current')]]);
  const { context } = loadServiceWorker({
    cacheImpl: cache,
    fetchImpl: async () => {
      throw new Error('network should not be used');
    }
  });

  const response = await context.audioFetch(new Request(requestedUrl));

  assert.equal(await response.text(), 'cached-current');
});

test('CACHE_AUDIO_URLS only writes fetched responses when the whole episode succeeds', async () => {
  const cache = createCache();
  const urls = [
    'https://example.test/audio/show/ep/combined.mp3?v=ok',
    'https://example.test/audio/show/ep/manifest.json?v=ok'
  ];
  const { listeners } = loadServiceWorker({
    cacheImpl: cache,
    fetchImpl: async (url) => {
      if (String(url).endsWith('manifest.json?v=ok')) {
        return new Response('missing', { status: 404 });
      }
      return new Response('audio-bytes', {
        headers: { 'content-length': String('audio-bytes'.length) }
      });
    }
  });

  let reply;
  const event = {
    data: { type: 'CACHE_AUDIO_URLS', urls },
    ports: [{ postMessage: (payload) => { reply = payload; } }],
    waitUntil: (promise) => { event.promise = promise; }
  };
  listeners.get('message')(event);
  await event.promise;

  assert.equal(reply.results[0].ok, true);
  assert.equal(reply.results[1].ok, false);
  assert.equal(cache.entries.size, 0);
});

// Netlify brotli-encodes manifest.json. The browser inflates the body before we
// see it, but Content-Length still describes the *encoded* bytes, so comparing
// it against blob.size failed every episode download with a bogus
// "Incomplete response" error.
test('CACHE_AUDIO_URLS accepts a transfer-compressed body whose Content-Length is the encoded size', async () => {
  const cache = createCache();
  const urls = [
    'https://example.test/audio/show/ep/combined.mp3?v=ok',
    'https://example.test/audio/show/ep/manifest.json?v=ok'
  ];
  const manifestBody = JSON.stringify({ items: 'x'.repeat(500) });
  const { listeners } = loadServiceWorker({
    cacheImpl: cache,
    fetchImpl: async (url) => {
      if (String(url).endsWith('manifest.json?v=ok')) {
        // Body arrives decoded; headers still describe the compressed transfer.
        return new Response(manifestBody, {
          headers: {
            'content-encoding': 'br',
            'content-length': String(Math.floor(manifestBody.length / 4)),
            'content-type': 'application/json'
          }
        });
      }
      return new Response('audio-bytes', {
        headers: { 'content-length': String('audio-bytes'.length) }
      });
    }
  });

  let reply;
  const event = {
    data: { type: 'CACHE_AUDIO_URLS', urls },
    ports: [{ postMessage: (payload) => { reply = payload; } }],
    waitUntil: (promise) => { event.promise = promise; }
  };
  listeners.get('message')(event);
  await event.promise;

  assert.equal(reply.results[0].ok, true);
  assert.equal(reply.results[1].ok, true);
  assert.equal(cache.entries.size, 2);

  // The cached entry must describe the bytes it actually holds, or the range
  // path will copy a stale encoding and length onto its 206 responses.
  const stored = cache.entries.get(urls[1]);
  assert.equal(stored.headers.get('content-encoding'), null);
  assert.equal(stored.headers.get('content-length'), String(manifestBody.length));
  assert.equal(await stored.text(), manifestBody);
});

test('CACHE_AUDIO_URLS still rejects a genuinely truncated uncompressed body', async () => {
  const cache = createCache();
  const { listeners } = loadServiceWorker({
    cacheImpl: cache,
    fetchImpl: async () => new Response('short', {
      headers: { 'content-length': '9999' }
    })
  });

  let reply;
  const event = {
    data: { type: 'CACHE_AUDIO_URLS', urls: ['https://example.test/audio/show/ep/combined.mp3'] },
    ports: [{ postMessage: (payload) => { reply = payload; } }],
    waitUntil: (promise) => { event.promise = promise; }
  };
  listeners.get('message')(event);
  await event.promise;

  assert.equal(reply.results[0].ok, false);
  assert.match(reply.results[0].error, /Incomplete response/);
  assert.equal(cache.entries.size, 0);
});
