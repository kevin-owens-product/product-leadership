import test from 'node:test';
import assert from 'node:assert/strict';

import {
    episodeBasename,
    combinedAudioUrl,
    manifestAudioUrl,
    withCacheKey,
    epKeyOf,
    stableCacheKey,
    attachAudioUrls,
    buildLineOffsets
} from '../../src/playback/manifest.js';

test('URL helpers derive audio paths from the episode file', () => {
    const episode = { file: 'episode-01-intro.md', id: 1 };
    assert.equal(episodeBasename(episode), 'episode-01-intro');
    assert.equal(combinedAudioUrl('show', episode), 'audio/show/episode-01-intro/combined.mp3');
    assert.equal(manifestAudioUrl('show', episode), 'audio/show/episode-01-intro/manifest.json');
    assert.equal(episodeBasename({ filename: 'ep.md' }), 'ep');
});

test('withCacheKey appends an encoded version query only when a key exists', () => {
    assert.equal(withCacheKey('a.mp3', 'k 1'), 'a.mp3?v=k%201');
    assert.equal(withCacheKey('a.mp3', ''), 'a.mp3');
});

test('epKeyOf scopes episode ids by podcast', () => {
    assert.equal(epKeyOf({ id: 'show' }, { id: 3 }), 'show-3');
});

test('stableCacheKey is deterministic and input-sensitive', () => {
    assert.equal(stableCacheKey('abc'), stableCacheKey('abc'));
    assert.notEqual(stableCacheKey('abc'), stableCacheKey('abd'));
    assert.match(stableCacheKey(''), /^[0-9a-z]+$/);
});

test('attachAudioUrls matches by rawLine when every item has one', () => {
    const dialogue = [{ rawLine: 2 }, { rawLine: 5 }];
    const manifest = {
        base: 'audio/show/ep',
        cacheKey: 'k',
        items: [
            { rawLine: 2, file: '0000.mp3', startTime: 0, duration: 2.5 },
            { rawLine: 5, file: '0001.mp3', startTime: 2.5, duration: 3 }
        ]
    };
    const matched = attachAudioUrls(dialogue, manifest);
    assert.equal(matched, 2);
    assert.equal(dialogue[0].audioUrl, 'audio/show/ep/0000.mp3?v=k');
    assert.equal(dialogue[1].audioStartTime, 2.5);
    assert.equal(dialogue[1].audioDuration, 3);
});

test('attachAudioUrls falls back to positional matching when counts align', () => {
    const dialogue = [{ rawLine: 9 }, { rawLine: 11 }];
    const manifest = {
        base: 'b',
        cacheKey: 'k',
        items: [
            { file: 'a.mp3', startTime: 0, duration: 1 },
            { file: 'b.mp3', startTime: 1, duration: 1 }
        ]
    };
    assert.equal(attachAudioUrls(dialogue, manifest), 2);
    assert.equal(dialogue[1].audioUrl, 'b/b.mp3?v=k');
});

test('buildLineOffsets returns offsets and total duration, or null on gaps', () => {
    const built = buildLineOffsets([
        { audioStartTime: 0, audioDuration: 2 },
        { audioStartTime: 2, audioDuration: 3.5 }
    ]);
    assert.deepEqual(built.offsets, [0, 2]);
    assert.equal(built.totalDuration, 5.5);

    assert.equal(buildLineOffsets([{ audioStartTime: 0 }]), null);
    assert.equal(buildLineOffsets([]), null);
});
