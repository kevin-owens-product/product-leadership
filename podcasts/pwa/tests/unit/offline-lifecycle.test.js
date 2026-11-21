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
                port.postMessage({ urls: urls.map((url) => base + url) });
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
    assert.equal(changes, 1);
    assert.deepEqual(backfilled, ['https://example.test/transcripts/show/two.md?v=script']);
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
