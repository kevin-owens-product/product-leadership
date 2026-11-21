import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';
import { createDownloadsManager } from '../../src/downloads/downloads.js';

test('Retry keeps the failed season and downloads only failed episodes that are still missing', async (t) => {
    const dom = new JSDOM(fs.readFileSync(new URL('../../index.html', import.meta.url), 'utf8'), {
        url: 'https://example.test/'
    });
    for (const key of ['window', 'document', 'location', 'localStorage']) {
        globalThis[key] = dom.window[key];
        t.after(() => { delete globalThis[key]; });
    }
    t.after(() => dom.window.close());
    const deletes = [];
    Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { controller: {
        postMessage(message, [port]) {
            if (message.type === 'DELETE_AUDIO_URLS') {
                deletes.push(message.urls);
                port.postMessage({ removed: message.urls.length });
            } else {
                port.postMessage({ results: message.urls.map((url) => ({ url, ok: true })) });
            }
        }
    } } });
    t.after(() => { delete navigator.serviceWorker; });
    const { createLibrary } = await import('../../src/ui/library.js');
    const episode = (id, season) => ({ id, title: 'Episode ' + id, file: id + '.md', season, audioBytes: 128 });
    const original = {
        id: 'original', title: 'Original', seasons: [{ number: 1, title: 'First' }, { number: 2, title: 'Second' }],
        episodes: [episode(1, 1), episode(2, 1), episode(3, 1), episode(4, 2)]
    };
    const other = { id: 'other', title: 'Other', episodes: [episode(1)] };
    let current = original;
    const attempts = [];
    const failures = new Set(['2.md', '3.md']);
    const notifications = [];
    const toasts = { show: (message, options) => notifications.push({ message, ...options }) };
    localStorage.setItem('downloadedEpisodes', JSON.stringify(['original-4', 'other-1']));
    const downloads = createDownloadsManager({
        toasts, setStatus() {}, onChange() {}, getPodcasts: () => [original, other],
        async loadManifest(id, file) {
            attempts.push([id, file]);
            return failures.has(file) ? null : { cacheKey: 'test' };
        }
    });
    const library = createLibrary({
        loadState: () => ({}), getCurrentPodcast: () => current, downloads, toasts, isQueued: () => false
    });
    library.renderEpisodeList();
    const button = document.getElementById('bulk-download-btn');
    await button.onclick();
    const firstRetry = notifications.at(-1);
    assert.equal(firstRetry.actionLabel, 'Retry');
    assert.deepEqual(attempts.map(([,file]) => file), ['1.md', '2.md', '3.md']);

    // One old success was intentionally removed, and one failure was fixed
    // separately. Neither belongs in the retry, regardless of the current view.
    await downloads.remove(original, original.episodes[0]);
    failures.delete('2.md');
    await downloads.download(original, original.episodes[1]);
    library.selectSeason(original, 2, { render: true });
    assert.equal(button.dataset.mode, 'remove');
    attempts.length = 0;
    await firstRetry.onAction();
    assert.deepEqual(attempts, [['original', '3.md']]);
    const secondRetry = notifications.at(-1);
    assert.equal(secondRetry.actionLabel, 'Retry');

    current = other;
    library.renderEpisodeList();
    assert.equal(button.dataset.mode, 'remove');
    failures.clear();
    await secondRetry.onAction();
    assert.deepEqual(attempts, [['original', '3.md'], ['original', '3.md']]);
    assert.equal(deletes.length, 1, 'only the explicit user removal should reach the worker');
    assert.equal(downloads.isDownloaded(original, original.episodes[2]), true);
    assert.equal(downloads.isDownloaded(original, original.episodes[3]), true);
    assert.equal(downloads.isDownloaded(other, other.episodes[0]), true);
});
