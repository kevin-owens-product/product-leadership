import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { parseMarkdown } from '../../src/parse/dialogue.js';
import { attachAudioUrls, buildLineOffsets } from '../../src/playback/manifest.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadServiceWorker({ fetchImpl, cacheImpl, shell = [] }) {
  const source = fs.readFileSync(path.join(__dirname, '../../sw.js'), 'utf8')
    .replace('const APP_SHELL_RAW = __APP_SHELL__;', `const APP_SHELL_RAW = ${JSON.stringify(shell)};`);
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
  const matches = (key, req, options) => {
    if (!req) return true;
    if (!options.ignoreSearch) return key === requestUrl(req);
    const a = new URL(key);
    const b = new URL(requestUrl(req));
    return a.origin === b.origin && a.pathname === b.pathname;
  };
  return {
    entries,
    async match(req, options = {}) {
      for (const [key, response] of entries) {
        if (matches(key, req, options)) return response.clone();
      }
      return undefined;
    },
    async put(req, response) {
      entries.set(requestUrl(req), response);
    },
    async delete(req, options = {}) {
      let removed = false;
      for (const key of [...entries.keys()]) {
        if (matches(key, req, options)) removed = entries.delete(key) || removed;
      }
      return removed;
    },
    async keys(req, options = {}) {
      return [...entries.keys()].filter((url) => matches(url, req, options)).map((url) => new Request(url));
    }
  };
}

async function sendMessage(listeners, data) {
  let reply;
  let work;
  listeners.get('message')({
    data,
    ports: [{ postMessage(value) { reply = value; } }],
    waitUntil(promise) { work = promise; }
  });
  await work;
  return reply;
}

test('a complete legacy or versioned download supplies its own manifest and media after a deploy', async () => {
  const base = 'https://example.test/audio/show/one/';
  for (const version of ['', '?v=installed']) {
    const cache = createCache([
      [base + 'combined.mp3' + version, new Response('saved recording')],
      [base + 'manifest.json' + version, new Response('saved timings')]
    ]);
    let requests = 0;
    const { context } = loadServiceWorker({
      cacheImpl: cache, fetchImpl: async () => { requests++; return new Response('new release'); }
    });
    const manifest = await context.audioFetch(new Request(base + 'manifest.json?v=new-timestamp'));
    assert.equal(manifest.headers.get('X-PodLearn-Audio-Cache-Key'), version ? 'installed' : '');
    assert.equal(await manifest.text(), 'saved timings');
    const media = await context.audioFetch(new Request(base + 'combined.mp3?v=new-header-derived-key', {
      headers: { Range: 'bytes=0-4' }
    }));
    assert.equal(media.status, 206);
    assert.equal(await media.text(), 'saved');
    assert.equal(requests, 0);
  }
});

test('a retry prefers a fresh recording and still plays saved bytes on offline or HTTP failure', async () => {
  const base = 'https://example.test/audio/show/one/';
  const cache = createCache([
    [base + 'combined.mp3?v=saved', new Response('saved recording')],
    [base + 'manifest.json?v=saved', new Response('saved timings')]
  ]);
  let error;
  let requests = 0;
  const { context } = loadServiceWorker({ cacheImpl: cache, fetchImpl: async (req, options) => {
    requests++;
    assert.equal(options.cache, 'reload');
    if (error === 'offline') throw new Error(error);
    return error ? new Response('', { status: 503 }) : new Response('fresh recording');
  } });
  const retry = new Request(base + 'combined.mp3?v=saved&podlearnRetry=1');
  assert.equal(await (await context.audioFetch(retry)).text(), 'fresh recording');
  for (error of ['origin unavailable', 'offline']) {
    assert.equal(await (await context.audioFetch(retry)).text(), 'saved recording');
  }
  assert.equal(requests, 3);
  assert.equal(cache.entries.size, 2);
});

test('old-tab single-file eviction is ignored and an explicit Remove clears all versions of that episode', async () => {
  const base = 'https://example.test/audio/show/one/';
  const audio = base + 'combined.mp3';
  const manifest = base + 'manifest.json';
  const script = 'https://example.test/transcripts/show/one.md';
  const other = 'https://example.test/audio/show/two/combined.mp3?v=saved';
  const keys = [audio, audio + '?v=old', audio + '?v=saved', manifest + '?v=saved', script + '?v=saved', other];
  const cache = createCache(keys.map((url) => [url, new Response('saved')]));
  const { listeners } = loadServiceWorker({ cacheImpl: cache });
  const remove = (urls) => sendMessage(listeners, { type: 'DELETE_AUDIO_URLS', urls });
  assert.equal((await remove([audio + '?v=other-build'])).removed, 0);
  assert.deepEqual([...cache.entries.keys()], keys);
  assert.equal((await remove([audio, manifest, script])).removed, 3);
  assert.deepEqual([...cache.entries.keys()], [other]);
  await cache.put(audio, new Response('pre-v2.7'));
  await cache.put(manifest, new Response('pre-v2.7'));
  assert.equal((await remove([audio, manifest])).removed, 2);
});

test('a legacy recording recovers its dialogue, chapters and line offsets offline, then prefers the original script online', async () => {
  const base = 'https://example.test/audio/show/one/';
  const manifest = [
    { rawLine: 2, type: 'cue', text: '[INTRO MUSIC]', chapter: 'Intro', startTime: 0, duration: 2 },
    { rawLine: 4, speaker: 'ALEX', text: 'Hello', chapter: 'Intro', startTime: 2, duration: 8 },
    { rawLine: 8, speaker: 'SAM', text: 'Goodbye', chapter: 'Wrap-up', startTime: 10, duration: 1 }
  ];
  const cache = createCache([
    [base + 'combined.mp3?v=legacy', new Response('audio')], [base + 'manifest.json?v=legacy', Response.json(manifest)],
    [base.replace('one/', 'broken/') + 'combined.mp3', new Response('audio')],
    [base.replace('one/', 'broken/') + 'manifest.json', Response.json([{ rawLine: 0, text: 'missing speaker' }])],
    [base.replace('one/', 'unpaired/') + 'manifest.json', Response.json(manifest)]
  ]);
  const scripts = createCache();
  let online = false;
  const { context, listeners } = loadServiceWorker({ cacheImpl: cache, fetchImpl: async () => {
    if (!online) throw new Error('offline');
    return new Response('original authored script');
  } });
  context.caches.open = async (name) => name === 'podlearn-transcripts-v1' ? scripts : cache;
  const script = 'https://example.test/transcripts/show/one.md';
  const inventory = await sendMessage(listeners, { type: 'LIST_OFFLINE_AUDIO' });
  assert.deepEqual(Array.from(inventory.recoverableTranscriptUrls), [script]);
  assert.deepEqual(Array.from(inventory.transcriptUrls), []);
  const req = new Request(script + '?v=release');
  const markdown = await (await context.transcriptFetch(req)).text();
  assert.equal(markdown.split('\n')[1], '### Intro');
  assert.equal(markdown.split('\n')[7], '### Wrap-up');
  const dialogue = parseMarkdown(markdown);
  assert.deepEqual(dialogue.map(({ rawLine, text }) => [rawLine, text]), [[4, 'Hello'], [8, 'Goodbye']]);
  assert.equal(attachAudioUrls(dialogue, { base, items: manifest }), 2);
  assert.deepEqual(buildLineOffsets(dialogue).offsets, [2, 10]);
  assert.equal(scripts.entries.size, 0);
  online = true;
  assert.equal(await (await context.transcriptFetch(req)).text(), 'original authored script');
  assert.equal((await sendMessage(listeners, { type: 'LIST_OFFLINE_AUDIO' })).recoverableTranscriptUrls.length, 0);
});

test('a saved recording continues to use its authored transcript when a release changes the script', async () => {
  const base = 'https://example.test/audio/show/one/';
  const script = 'https://example.test/transcripts/show/one.md';
  const cache = createCache([
    [base + 'combined.mp3?v=pinned', new Response('saved recording')],
    [base + 'manifest.json?v=pinned', new Response('saved timings')],
    [script + '?v=old', new Response('dialogue for the saved recording')]
  ]);
  const scripts = createCache([[script + '?v=current', new Response('dialogue for the new recording')]]);
  const { context } = loadServiceWorker({ cacheImpl: cache, fetchImpl: () => assert.fail('script already available') });
  context.caches.open = async name => name === 'podlearn-transcripts-v1' ? scripts : cache;
  const req = new Request(script + '?v=current');
  assert.equal(await (await context.transcriptFetch(req)).text(), 'dialogue for the saved recording');
  await cache.delete(base + 'combined.mp3?v=pinned');
  assert.equal(await (await context.transcriptFetch(req)).text(), 'dialogue for the new recording');
});

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

test('audioFetch falls back to a downloaded episode on an HTTP origin failure', async () => {
  const cachedUrl = 'https://example.test/audio/show/ep/combined.mp3?v=downloaded';
  const requestedUrl = 'https://example.test/audio/show/ep/combined.mp3?v=current';
  const cache = createCache([[cachedUrl, new Response('downloaded-audio')]]);
  const { context } = loadServiceWorker({
    cacheImpl: cache,
    fetchImpl: async () => new Response('temporary failure', { status: 503 })
  });

  const response = await context.audioFetch(new Request(requestedUrl));

  assert.equal(response.status, 200);
  assert.equal(await response.text(), 'downloaded-audio');
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

test('quota failure rolls back a partial download, replies and permits a retry', async () => {
  const base = 'https://example.test/audio/show/episode/';
  const old = ['combined.mp3?v=old', 'manifest.json?v=old'].map((file) => base + file);
  const urls = ['combined.mp3?v=current', 'manifest.json?v=current'].map((file) => base + file);
  old.push('https://example.test/transcripts/show/episode.md?v=old-script');
  urls.push('https://example.test/transcripts/show/episode.md?v=new-script');
  const cache = createCache(old.map((url) => [url, new Response('previous download')]));
  const put = cache.put;
  cache.put = async (url, response) => {
    if (url === urls[2]) throw new DOMException('Storage full', 'QuotaExceededError');
    return put(url, response);
  };
  const { listeners } = loadServiceWorker({ cacheImpl: cache, fetchImpl: async () => new Response('new content') });
  async function download() {
    let completed;
    let reply;
    listeners.get('message')({
      data: { type: 'CACHE_AUDIO_URLS', urls },
      ports: [{ postMessage: (msg) => { reply = msg; } }],
      waitUntil: (promise) => { completed = promise; }
    });
    await completed;
    return reply.results;
  }
  const failed = await download();
  assert.ok(failed.every((entry) => !entry.ok && entry.error.includes('Storage full')));
  assert.deepEqual([...cache.entries.keys()], old);
  cache.put = put;
  assert.ok((await download()).every((entry) => entry.ok));
  assert.deepEqual([...cache.entries.keys()], urls);
});

test('install fails if the batch of required shell assets cannot be cached', async () => {
  const shell = ['https://example.test/index.html', 'https://example.test/src/main.js'];
  const cache = {
    async addAll(requests) {
      assert.deepEqual(Array.from(requests, (req) => req.url), shell);
      assert.ok(requests.every((req) => req.cache === 'reload'));
      throw new Error('main.js unavailable');
    }
  };
  const { context, listeners } = loadServiceWorker({ cacheImpl: cache, shell });
  let skippedWaiting = false;
  context.self.skipWaiting = () => { skippedWaiting = true; };
  let install;
  listeners.get('install')({ waitUntil: (promise) => { install = promise; } });
  await assert.rejects(install, /main.js unavailable/);
  assert.equal(skippedWaiting, false);
});

test('activation retires older app shells and keeps downloaded audio and unrelated caches', async () => {
  const { context, listeners } = loadServiceWorker({ cacheImpl: createCache() });
  const names = ['podlearn-shell-previous', 'podlearn-shell-__BUILD_VERSION__', 'podlearn-offline-audio-v1', 'podlearn-transcripts-v1', 'other-app-cache'];
  const removed = [];
  context.caches.keys = async () => names;
  context.caches.delete = async (name) => removed.push(name);
  let activation;
  listeners.get('activate')({ waitUntil: (promise) => { activation = promise; } });
  await activation;
  assert.deepEqual(removed, ['podlearn-shell-previous']);
});

test('a full transcript cache still serves the online script and retains its offline copy', async () => {
  const oldUrl = 'https://example.test/transcripts/show/one.md?v=old';
  const old = new Response('previous episode script');
  const cached = createCache([[oldUrl, old]]);
  cached.put = async () => { throw new DOMException('Storage full', 'QuotaExceededError'); };
  const { context } = loadServiceWorker({ cacheImpl: cached, fetchImpl: async () => new Response('current episode script') });
  const response = await context.transcriptFetch(new Request('https://example.test/transcripts/show/one.md?v=new'));
  assert.equal(await response.text(), 'current episode script');
  assert.equal(cached.entries.get(oldUrl), old);
});
