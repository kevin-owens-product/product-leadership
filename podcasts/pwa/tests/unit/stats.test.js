import test from 'node:test';
import assert from 'node:assert/strict';
import { createStatsTracker } from '../../src/state/stats.js';

function memoryStorage(t) {
    const saved = new Map();
    const previousStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
        getItem: key => saved.get(key), setItem: (key, value) => saved.set(key, value)
    } });
    t.after(() => {
        if (previousStorage) Object.defineProperty(globalThis, 'localStorage', previousStorage);
        else delete globalThis.localStorage;
    });
    return saved;
}

test('only audible playback contributes to listening time across pauses, stalls and source changes', (t) => {
    const saved = memoryStorage(t);
    let time = 0;
    const stats = createStatsTracker({ now: () => time });
    const shared = Object.assign(new EventTarget(), { paused: false, playbackRate: 1, readyState: 4 });
    const chunk = Object.assign(new EventTarget(), { paused: false, playbackRate: 2 });
    stats.trackAudio(shared);
    stats.trackAudio(chunk);
    time += 3600000;
    shared.dispatchEvent(new Event('playing'));
    time += 3000;
    shared.dispatchEvent(new Event('waiting'));
    time += 30000;
    shared.dispatchEvent(new Event('playing'));
    time += 3000;
    shared.dispatchEvent(new Event('seeking'));
    time += 2000;
    shared.dispatchEvent(new Event('seeked'));
    time += 4000;
    shared.dispatchEvent(new Event('pause'));
    time += 100000;
    chunk.dispatchEvent(new Event('playing'));
    time += 2000;
    shared.dispatchEvent(new Event('emptied'));
    time += 3000;
    chunk.dispatchEvent(new Event('ended'));
    const recorded = JSON.parse(saved.get('listeningStats'));
    assert.equal(recorded.totalTime, 15);
    assert.equal(recorded.speedSum / recorded.speedCount, (10 + 5 * 2) / 15);
});

test('overlapping trackers add their own elapsed seconds and completions to shared statistics', async t => {
    const saved = memoryStorage(t);
    let time = 0;
    const first = createStatsTracker({ now: () => time });
    const second = createStatsTracker({ now: () => time });
    const audio = rate => Object.assign(new EventTarget(), { paused: false, playbackRate: rate });
    const a = audio(1);
    const b = audio(2);
    first.trackAudio(a);
    second.trackAudio(b);
    a.dispatchEvent(new Event('playing'));
    time += 1800000;
    await first.stopTracking();
    first.noteEpisodeCompleted();
    b.dispatchEvent(new Event('playing'));
    time += 5000;
    await second.stopTracking();
    second.noteEpisodeCompleted();
    const stats = JSON.parse(saved.get('listeningStats'));
    assert.equal(stats.totalTime, 1805);
    assert.equal(stats.speedCount, 180.5);
    assert.equal(stats.speedSum, 181);
    assert.equal(stats.episodesCompleted, 2);
    assert.equal(stats.currentStreak, 1);
});
