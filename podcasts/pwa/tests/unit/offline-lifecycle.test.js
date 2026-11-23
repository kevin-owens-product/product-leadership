import test from 'node:test';
import assert from 'node:assert/strict';
import { createDownloadsManager } from '../../src/downloads/downloads.js';
import { registerServiceWorker } from '../../src/sw/register-sw.js';

function stub(t, target, key, value) {
    const original = Object.getOwnPropertyDescriptor(target, key);
    Object.defineProperty(target, key, { value, configurable: true });
    t.after(() => original ? Object.defineProperty(target, key, original) : Reflect.deleteProperty(target, key));
}

function storageWithDownloads(t, downloaded) {
    const values = new Map([['downloadedEpisodes', JSON.stringify(downloaded)]]);
    stub(t, globalThis, 'localStorage', {
        getItem: key => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, value),
        clear: () => values.clear()
    });
    return key => JSON.parse(localStorage.getItem(key));
}

test('reconciliation requires both files of the same episode version', async (t) => {
    const base = 'https://example.test/audio/show/';
    const urls = ['one/combined.mp3?v=1', 'one/manifest.json?v=2', 'two/combined.mp3', 'two/manifest.json'];
    const stored = storageWithDownloads(t, ['show-1']);
    let changes = 0;
    const backfilled = [];
    stub(t, globalThis, 'location', new URL('https://example.test/'));
    stub(t, navigator, 'serviceWorker', { controller: {
        postMessage(message, [port]) {
            if (message.type === 'CACHE_AUDIO_URLS') {
                backfilled.push(...message.urls);
                port.postMessage({ results: message.urls.map((url) => ({ url, ok: true })) });
            } else {
                port.postMessage({ urls: [...urls.map((url) => base + url), ...backfilled], transcriptUrls: [] });
            }
        }
    } });
    const podcast = { id: 'show', episodes: [
        { id: 1, file: 'one.md' }, { id: 2, file: 'two.md', transcriptHash: 'script' }
    ] };
    const manager = createDownloadsManager({ getPodcasts: () => [podcast], onChange: () => { changes++; } });
    await manager.reconcile();
    assert.equal(manager.isDownloaded(podcast, podcast.episodes[0]), false);
    assert.equal(manager.isDownloaded(podcast, podcast.episodes[1]), true);
    assert.equal(manager.isRecoverable(podcast, podcast.episodes[0]), true);
    assert.deepEqual(stored('downloadedEpisodes'), ['show-2']);
    assert.equal(changes, 2, 'publish the verified list, then add the repaired episode');
    assert.deepEqual(backfilled, ['https://example.test/transcripts/show/two.md?v=script']);
});

test('download verification survives missing control and only lists complete offline episodes', async (t) => {
    const origin = 'https://example.test/';
    const episodes = ['missing-script', 'available', 'missing-audio', 'missing-manifest'].map((name, id) => ({
        id: id + 1, file: name + '.md', transcriptHash: 'current'
    }));
    const podcast = { id: 'show', episodes };
    const urls = [
        'audio/show/missing-script/combined.mp3?v=1', 'audio/show/missing-script/manifest.json?v=1',
        'audio/show/available/combined.mp3?v=1', 'audio/show/available/manifest.json?v=1',
        'audio/show/missing-audio/manifest.json?v=1', 'audio/show/missing-manifest/combined.mp3?v=1',
        'transcripts/show/missing-audio.md?v=current', 'transcripts/show/missing-manifest.md?v=current'
    ].map((url) => origin + url);
    const transcriptUrls = [origin + 'transcripts/show/available.md?v=older'];
    const stored = storageWithDownloads(t, ['show-1','show-2','show-3','show-4']);
    stub(t, globalThis, 'location', new URL(origin));
    stub(t, navigator, 'onLine', true);
    const worker = { controller: null };
    stub(t, navigator, 'serviceWorker', worker);
    const manager = createDownloadsManager({ getPodcasts: () => [podcast], onChange() {} });

    await manager.reconcile();
    assert.equal(manager.hasVerifiedDownloads(), false);
    assert.deepEqual(stored('downloadedEpisodes'), ['show-1','show-2','show-3','show-4']);

    let backfillSucceeded = false;
    worker.controller = {
        postMessage(message, [port]) {
            if (message.type === 'LIST_OFFLINE_AUDIO') port.postMessage({ urls, transcriptUrls });
            else {
                if (backfillSucceeded) urls.push(...message.urls);
                port.postMessage({ results: message.urls.map((url) => ({ url, ok: backfillSucceeded })) });
            }
        }
    };
    await manager.reconcile();
    assert.equal(manager.hasVerifiedDownloads(), true);
    assert.deepEqual(stored('downloadedEpisodes'), ['show-2'], 'a failed script repair cannot count as a playable download');
    assert.deepEqual(stored('downloadSelections'), ['show-1','show-2','show-3','show-4']);
    backfillSucceeded = true;
    await manager.reconcile();
    assert.deepEqual(stored('downloadedEpisodes').sort(), ['show-1', 'show-2']);
});

test('a transcript repair cannot restore an episode removed in another tab', async (t) => {
    const base = 'https://example.test/audio/show/one/';
    let urls = [base + 'combined.mp3?v=1', base + 'manifest.json?v=1'];
    const episode = { id: 1, file: 'one.md', transcriptHash: 'script' };
    const podcast = { id: 'show', episodes: [episode] };
    storageWithDownloads(t, ['show-1']);
    stub(t, globalThis, 'location', new URL('https://example.test/'));
    stub(t, navigator, 'onLine', true);
    let snapshots = 0;
    stub(t, navigator, 'serviceWorker', { controller: {
        postMessage(message, [port]) {
            if (message.type === 'LIST_OFFLINE_AUDIO') {
                snapshots++;
                port.postMessage({ urls, transcriptUrls: [] });
            } else {
                // The other tab removed the audio and manifest while this
                // tab was fetching the script. Only the script remains.
                urls = [...message.urls];
                localStorage.setItem('downloadSelections', '[]');
                localStorage.setItem('downloadedEpisodes', '[]');
                port.postMessage({ results: message.urls.map((url) => ({ url, ok: true })) });
            }
        }
    } });
    const manager = createDownloadsManager({ getPodcasts: () => [podcast], onChange() {} });
    await manager.reconcile();
    assert.equal(snapshots, 2);
    assert.equal(manager.hasVerifiedDownloads(), true);
    assert.equal(manager.isDownloaded(podcast, episode), false);
    assert.equal(manager.isRecoverable(podcast, episode), false);
});

test('a delayed verification snapshot cannot undo a completed download', async (t) => {
    const episode = { id: 1, file: 'one.md', title: 'One', transcriptHash: 'script' };
    const podcast = { id: 'show', episodes: [episode] };
    storageWithDownloads(t, []);
    stub(t, globalThis, 'location', new URL('https://example.test/'));
    let release;
    let cached = [];
    stub(t, navigator, 'serviceWorker', { controller: {
        postMessage(message, [port]) {
            if (message.type === 'LIST_OFFLINE_AUDIO') {
                if (!release) release = () => port.postMessage({ urls: [], transcriptUrls: [] });
                else port.postMessage({ urls: cached, transcriptUrls: [] });
            } else {
                cached = message.urls;
                port.postMessage({ results: cached.map((url) => ({ url, ok: true })) });
            }
        }
    } });
    const manager = createDownloadsManager({
        getPodcasts: () => [podcast], onChange() {}, setStatus() {},
        loadManifest: async () => ({ cacheKey: 'one-version' })
    });
    const verifying = manager.reconcile();
    assert.equal(await manager.download(podcast, episode), true);
    release();
    await verifying;
    assert.equal(manager.hasVerifiedDownloads(), true);
    assert.equal(manager.isDownloaded(podcast, episode), true);
});

test('orphaned audio and manifests recover erased selections across reloads and explicit removal', async (t) => {
    const stored = storageWithDownloads(t, []);
    const origin = 'https://example.test/';
    stub(t, globalThis, 'location', new URL(origin));
    const episodes = ['audio', 'manifest', 'script', 'streamed'].map((name, id) => ({
        id, title: name, file: name + '.md', transcriptHash: 'v1'
    }));
    const podcast = { id: 'show', episodes };
    let urls = [
        origin + 'audio/show/audio/combined.mp3?v=old',
        origin + 'audio/show/manifest/manifest.json',
        origin + 'transcripts/show/script.md?v=v1'
    ];
    const transcriptUrls = [origin + 'transcripts/show/streamed.md?v=v1'];
    stub(t, navigator, 'serviceWorker', { controller: {
        postMessage(message, [port]) {
            if (message.type === 'LIST_OFFLINE_AUDIO') return port.postMessage({ urls, transcriptUrls });
            assert.equal(message.type, 'DELETE_AUDIO_URLS', 'reconciliation never downloads missing audio automatically');
            urls = urls.filter(url => !message.urls.includes(url.split('?')[0]));
            port.postMessage({ removed: 1 });
        }
    } });
    const create = () => createDownloadsManager({ getPodcasts: () => [podcast], onChange() {}, setStatus() {} });
    const first = create();
    await first.reconcile();
    assert.deepEqual(stored('downloadSelections'), ['show-0', 'show-1']);
    assert.deepEqual(stored('downloadedEpisodes'), []);
    assert.deepEqual(episodes.map(ep => first.isRecoverable(podcast, ep)), [true, true, false, false]);
    // Even full cache eviction must retain the repair affordance.
    urls = [];
    const second = create();
    await second.reconcile();
    assert.equal(second.isRecoverable(podcast, episodes[0]), true);
    await second.remove(podcast, episodes[0]);
    await first.reconcile();
    assert.deepEqual(episodes.map(ep => first.isRecoverable(podcast, ep)), [false, true, false, false]);
    assert.deepEqual(stored('downloadSelections'), ['show-1']);
});

test('workers with an audio-only inventory can still serve scripts from their transcript cache', async (t) => {
    storageWithDownloads(t, ['show-1']);
    const origin = 'https://example.test/';
    const episode = { id: 1, file: 'one.md', transcriptHash: 'new' };
    const podcast = { id: 'show', episodes: [episode] };
    const urls = ['combined.mp3', 'manifest.json'].map(file => origin + 'audio/show/one/' + file);
    stub(t, globalThis, 'location', new URL(origin));
    stub(t, navigator, 'onLine', false);
    let fail = false;
    stub(t, globalThis, 'caches', { open: async name => {
        assert.equal(name, 'podlearn-transcripts-v1');
        if (fail) throw Error('temporarily unavailable');
        return { keys: async () => [{ url: origin + 'transcripts/show/one.md?v=old' }] };
    } });
    let reply = { urls };
    stub(t, navigator, 'serviceWorker', { controller: {
        postMessage(message, [port]) {
            assert.equal(message.type, 'LIST_OFFLINE_AUDIO');
            port.postMessage(reply);
        }
    } });
    const manager = createDownloadsManager({ getPodcasts: () => [podcast], onChange() {} });
    await manager.reconcile();
    assert.equal(manager.isDownloaded(podcast, episode), true);
    assert.equal(manager.hasVerifiedDownloads(), true);
    fail = true;
    for (reply of [{ urls: [] }, { error: 'Unable to read downloads', urls: [] }, { urls: [], transcriptUrls: null }]) {
        await manager.reconcile();
        assert.equal(manager.hasVerifiedDownloads(), true, 'transient checks keep the last verified shelf visible');
        assert.equal(manager.isDownloaded(podcast, episode), true);
    }
    reply = { urls: [], transcriptUrls: [] };
    await manager.reconcile();
    assert.equal(manager.isDownloaded(podcast, episode), false);
    assert.equal(manager.isRecoverable(podcast, episode), true);
});

test('a recording with recoverable dialogue stays playable without pinning a newer online script', async (t) => {
    storageWithDownloads(t, []);
    const origin = 'https://example.test/';
    const episode = { id: 1, file: 'one.md', transcriptHash: 'current' };
    const podcast = { id: 'show', episodes: [episode] };
    const script = origin + 'transcripts/show/one.md?v=current';
    const urls = ['combined.mp3?v=old', 'manifest.json?v=old'].map(file => origin + 'audio/show/one/' + file);
    stub(t, globalThis, 'location', new URL(origin));
    stub(t, navigator, 'onLine', false);
    stub(t, navigator, 'serviceWorker', { controller: {
        postMessage(message, [port]) {
            assert.equal(message.type, 'LIST_OFFLINE_AUDIO');
            port.postMessage({ urls, transcriptUrls: [], recoverableTranscriptUrls: [script.split('?')[0]] });
        }
    } });
    const manager = createDownloadsManager({ getPodcasts: () => [podcast], onChange() {} });
    await manager.reconcile();
    assert.equal(manager.isDownloaded(podcast, episode), true);
    stub(t, navigator, 'onLine', true);
    await manager.reconcile();
    assert.equal(manager.isDownloaded(podcast, episode), true);
});

test('withdrawn downloads can be removed individually with an empty catalog', async (t) => {
    const stored = storageWithDownloads(t, ['retired-1', 'retired-2']);
    const origin = 'https://example.test/';
    const files = ['episode-01-old', 'episode-02-also-old'];
    let urls = files.flatMap(slug => [
        origin + 'audio/retired/' + slug + '/combined.mp3?v=1',
        origin + 'audio/retired/' + slug + '/manifest.json?v=1',
        origin + 'transcripts/retired/' + slug + '.md?v=old'
    ]);
    stub(t, globalThis, 'location', new URL(origin));
    stub(t, navigator, 'serviceWorker', { controller: {
        postMessage(message, [port]) {
            if (message.type === 'LIST_OFFLINE_AUDIO') return port.postMessage({ urls, transcriptUrls: [] });
            assert.equal(message.type, 'DELETE_AUDIO_URLS');
            urls = urls.filter(url => !message.urls.includes(url.split('?')[0]));
            port.postMessage({ removed: 3 });
        }
    } });
    const manager = createDownloadsManager({ getPodcasts: () => [], onChange() {}, setStatus() {} });
    await manager.reconcile();
    assert.equal(manager.getWithdrawn().length, 2);
    await manager.removeWithdrawn(manager.getWithdrawn()[0]);
    await manager.reconcile();
    assert.deepEqual(stored('downloadSelections'), ['retired-2']);
    assert.deepEqual(stored('downloadedEpisodes'), ['retired-2']);
    assert.deepEqual(manager.getWithdrawn().map(entry => entry.episode.title), ['Episode 02 Also Old']);
    assert.equal(urls.length, 3);
});

test('a controller change abandons an unanswered inventory and retries against the new worker', async (t) => {
    const stored = storageWithDownloads(t, ['show-1']);
    const origin = 'https://example.test/';
    stub(t, globalThis, 'location', new URL(origin));
    const workers = new EventTarget();
    stub(t, navigator, 'serviceWorker', workers);
    workers.controller = { postMessage() {} };
    const episode = { id: 1, file: 'one.md' };
    const podcast = { id: 'show', episodes: [episode] };
    const manager = createDownloadsManager({ getPodcasts: () => [podcast], onChange() {} });
    const old = manager.reconcile();
    workers.controller = { postMessage(message, [port]) {
        const urls = ['combined.mp3', 'manifest.json'].map(file => origin + 'audio/show/one/' + file);
        port.postMessage({ urls, transcriptUrls: [] });
    } };
    workers.dispatchEvent(new Event('controllerchange'));
    await old;
    assert.equal(manager.hasVerifiedDownloads(), true);
    assert.deepEqual(stored('downloadedEpisodes'), ['show-1']);
});

test('another tab can remove or reset selections while this tab holds an older cache snapshot', async (t) => {
    const stored = storageWithDownloads(t, ['show-1', 'show-2']);
    const origin = 'https://example.test/';
    stub(t, globalThis, 'location', new URL(origin));
    stub(t, globalThis, 'window', new EventTarget());
    const episodes = ['one', 'two'].map((name, i) => ({ id: i + 1, file: name + '.md' }));
    const podcast = { id: 'show', episodes };
    const urls = ['combined.mp3', 'manifest.json'].map(file => origin + 'audio/show/one/' + file);
    let release;
    stub(t, navigator, 'serviceWorker', { controller: {
        postMessage(message, [port]) {
            if (!release) release = () => port.postMessage({ urls, transcriptUrls: [] });
            else port.postMessage({ urls: [], transcriptUrls: [] });
        }
    } });
    const manager = createDownloadsManager({ getPodcasts: () => [podcast], onChange() {} });
    const old = manager.reconcile();
    localStorage.setItem('downloadSelections', '["show-2"]');
    localStorage.setItem('downloadedEpisodes', '[]');
    // Even before the browser delivers its storage event, the in-flight
    // snapshot must not resurrect the just-removed episode.
    release();
    await old;
    assert.equal(manager.isRecoverable(podcast, episodes[0]), false);
    assert.equal(manager.isRecoverable(podcast, episodes[1]), true);
    assert.deepEqual(stored('downloadSelections'), ['show-2']);

    localStorage.clear();
    window.dispatchEvent(Object.assign(new Event('storage'), { key: null, newValue: null }));
    await manager.reconcile();
    assert.equal(manager.isRecoverable(podcast, episodes[1]), false);
    assert.deepEqual(stored('downloadSelections'), []);
});

test('the version check updates the active registration and keeps the stored audio cache', async (t) => {
    let updates = 0;
    const registration = { update: async () => { updates++; } };
    const cache = new Set(['podlearn-shell-old', 'podlearn-offline-audio-v1']);
    const caches = { keys: async () => [...cache], delete: async (name) => cache.delete(name) };
    stub(t, globalThis, 'window', { caches, location: { reload: assert.fail } });
    stub(t, globalThis, 'caches', caches);
    stub(t, navigator, 'serviceWorker', { controller: {}, getRegistration: async () => registration });
    stub(t, globalThis, 'document', { getElementById: () => null });
    stub(t, globalThis, 'localStorage', { getItem: () => 'old', setItem() {} });
    let metadata;
    stub(t, globalThis, 'fetch', async () => Response.json(metadata));
    const { checkForUpdates } = await import('../../src/app/version.js');
    for (metadata of [{ buildVersion: 'new' }, { version: 'new' }]) await checkForUpdates();
    assert.equal(updates, 2);
    assert.deepEqual([...cache], ['podlearn-shell-old', 'podlearn-offline-audio-v1']);
});

test('a pending upgrade reloads only the tab that chose to apply it', async (t) => {
    const serviceWorker = new EventTarget();
    const registration = new EventTarget();
    const messages = [];
    registration.waiting = { postMessage: (message) => messages.push(message) };
    serviceWorker.controller = {};
    serviceWorker.register = async () => registration;
    stub(t, navigator, 'serviceWorker', serviceWorker);
    stub(t, globalThis, 'document', { getElementById: () => null });
    stub(t, globalThis, 'setInterval', () => {});
    let reloads = 0;
    stub(t, globalThis, 'window', { location: { reload: () => { reloads++; } } });
    let announced = 0;
    const client = registerServiceWorker({ onUpdateAvailable: () => { announced++; } });
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(announced, 1, 'discover a waiting worker from a previous visit');
    serviceWorker.dispatchEvent(new Event('controllerchange'));
    assert.equal(reloads, 0);
    await client.applyUpdate();
    assert.deepEqual(messages, ['SKIP_WAITING']);
    assert.equal(reloads, 0, 'wait until activation finishes before reloading');
    serviceWorker.dispatchEvent(new Event('controllerchange'));
    assert.equal(reloads, 1);

    registration.waiting = null;
    registration.update = async () => { throw new Error('offline'); };
    await assert.rejects(client.refresh(), /offline/);
    assert.equal(reloads, 1);
});
