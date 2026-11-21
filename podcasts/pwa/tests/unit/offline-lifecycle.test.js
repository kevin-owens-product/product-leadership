import test from 'node:test';
import assert from 'node:assert/strict';
import { createDownloadsManager } from '../../src/downloads/downloads.js';
import { registerServiceWorker } from '../../src/sw/register-sw.js';

function stub(t, target, key, value) {
    const original = Object.getOwnPropertyDescriptor(target, key);
    Object.defineProperty(target, key, { value, configurable: true });
    t.after(() => original ? Object.defineProperty(target, key, original) : Reflect.deleteProperty(target, key));
}

test('reconciliation requires both files of the same episode version', async (t) => {
    const base = 'https://example.test/audio/show/';
    const urls = ['one/combined.mp3?v=1', 'one/manifest.json?v=2', 'two/combined.mp3', 'two/manifest.json'];
    let stored = '["show-1"]';
    let changes = 0;
    stub(t, globalThis, 'localStorage', { getItem: () => stored, setItem: (_, value) => { stored = value; } });
    const backfilled = [];
    stub(t, globalThis, 'location', new URL('https://example.test/'));
    stub(t, navigator, 'serviceWorker', { controller: {
        postMessage(message, [port]) {
            if (message.type === 'CACHE_AUDIO_URLS') {
                backfilled.push(...message.urls);
                port.postMessage({ results: message.urls.map((url) => ({ url, ok: true })) });
            } else {
                port.postMessage({ urls: [...urls.map((url) => base + url), ...backfilled] });
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
    assert.deepEqual(JSON.parse(stored), ['show-2']);
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
    let stored = '["show-1","show-2","show-3","show-4"]';
    stub(t, globalThis, 'localStorage', { getItem: () => stored, setItem: (_, value) => { stored = value; } });
    stub(t, globalThis, 'location', new URL(origin));
    stub(t, navigator, 'onLine', true);
    const worker = { controller: null };
    stub(t, navigator, 'serviceWorker', worker);
    const manager = createDownloadsManager({ getPodcasts: () => [podcast], onChange() {} });

    await manager.reconcile();
    assert.equal(manager.hasVerifiedDownloads(), false);
    assert.deepEqual(JSON.parse(stored), ['show-1','show-2','show-3','show-4']);

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
    assert.deepEqual(JSON.parse(stored), ['show-2'], 'a failed script repair cannot count as a playable download');
    backfillSucceeded = true;
    await manager.reconcile();
    assert.deepEqual(JSON.parse(stored).sort(), ['show-1', 'show-2']);
});

test('a transcript repair cannot restore an episode removed in another tab', async (t) => {
    const base = 'https://example.test/audio/show/one/';
    let urls = [base + 'combined.mp3?v=1', base + 'manifest.json?v=1'];
    const episode = { id: 1, file: 'one.md', transcriptHash: 'script' };
    const podcast = { id: 'show', episodes: [episode] };
    stub(t, globalThis, 'localStorage', { getItem: () => '["show-1"]', setItem() {} });
    stub(t, globalThis, 'location', new URL(base));
    stub(t, navigator, 'onLine', true);
    let snapshots = 0;
    stub(t, navigator, 'serviceWorker', { controller: {
        postMessage(message, [port]) {
            if (message.type === 'LIST_OFFLINE_AUDIO') {
                snapshots++;
                port.postMessage({ urls });
            } else {
                // The other tab removed the audio and manifest while this
                // tab was fetching the script. Only the script remains.
                urls = [...message.urls];
                port.postMessage({ results: message.urls.map((url) => ({ url, ok: true })) });
            }
        }
    } });
    const manager = createDownloadsManager({ getPodcasts: () => [podcast], onChange() {} });
    await manager.reconcile();
    assert.equal(snapshots, 2);
    assert.equal(manager.hasVerifiedDownloads(), true);
    assert.equal(manager.isDownloaded(podcast, episode), false);
});

test('a delayed verification snapshot cannot undo a completed download', async (t) => {
    const episode = { id: 1, file: 'one.md', title: 'One', transcriptHash: 'script' };
    const podcast = { id: 'show', episodes: [episode] };
    stub(t, globalThis, 'localStorage', { getItem: () => '[]', setItem() {} });
    stub(t, globalThis, 'location', new URL('https://example.test/'));
    let release;
    let cached = [];
    stub(t, navigator, 'serviceWorker', { controller: {
        postMessage(message, [port]) {
            if (message.type === 'LIST_OFFLINE_AUDIO') {
                if (!release) release = () => port.postMessage({ urls: [] });
                else port.postMessage({ urls: cached });
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
