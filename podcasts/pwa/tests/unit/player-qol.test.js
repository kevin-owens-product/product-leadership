import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createNewEpisodeTracker, NEW_EPISODES_KEY } from '../../src/state/new-episodes.js';
import { ensureEpisodeContent, transcriptUrl } from '../../src/app/transcripts.js';
import { getContinueListening } from '../../src/ui/seasons.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, '..', '..', 'dist');

function mockStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v))
  };
}

const DAY = 24 * 60 * 60 * 1000;

test('first run treats the existing catalog as known except very recent episodes', () => {
  const t0 = Date.parse('2026-11-14T12:00:00Z');
  const tracker = createNewEpisodeTracker({ storage: mockStorage(), now: () => t0 });
  const podcast = {
    id: 'show',
    episodes: [
      { id: 1, published: '2026-10-01T00:00:00Z' },
      { id: 2, published: '2026-11-14T08:00:00Z' }
    ]
  };
  tracker.syncCatalog([podcast]);
  assert.equal(tracker.isNew(podcast, podcast.episodes[0]), false);
  assert.equal(tracker.isNew(podcast, podcast.episodes[1]), true);
  assert.equal(tracker.countNew(podcast), 1);
});

test('episodes that arrive later are new until opened, played or 30 days old', () => {
  let t = Date.parse('2026-11-01T00:00:00Z');
  const storage = mockStorage();
  const tracker = createNewEpisodeTracker({ storage, now: () => t });
  const podcast = { id: 'show', episodes: [{ id: 1 }] };
  tracker.syncCatalog([podcast]);
  assert.equal(tracker.countNew(podcast), 0);

  t += DAY;
  podcast.episodes.push({ id: 2 }, { id: 3 }, { id: 4 });
  tracker.syncCatalog([podcast]);
  assert.equal(tracker.countNew(podcast), 3);

  tracker.markOpened(podcast, podcast.episodes[1]);
  const state = { episodeProgress: { 'show-3': { percent: 20 } } };
  assert.equal(tracker.countNew(podcast, state), 1);

  // State survives a reload.
  const reloaded = createNewEpisodeTracker({ storage, now: () => t });
  assert.equal(reloaded.countNew(podcast, state), 1);
  assert.ok(JSON.parse(storage.getItem(NEW_EPISODES_KEY)).initialized);

  t += 31 * DAY;
  assert.equal(reloaded.countNew(podcast, state), 0);
});

test('transcripts are fetched once, cached on the episode, and versioned by hash', async () => {
  const episode = { id: 1, file: 'episode-01-x.md', transcriptHash: 'abc123' };
  assert.equal(transcriptUrl('my-show', episode), 'transcripts/my-show/episode-01-x.md?v=abc123');
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return { ok: true, text: async () => '**A:** hello' };
  };
  const [a, b] = await Promise.all([
    ensureEpisodeContent('my-show', episode, { fetchImpl }),
    ensureEpisodeContent('my-show', episode, { fetchImpl })
  ]);
  assert.equal(a, '**A:** hello');
  assert.equal(b, a);
  assert.equal(calls, 1);
  assert.equal(await ensureEpisodeContent('my-show', episode, { fetchImpl }), a);
  assert.equal(calls, 1);
});

test('a controlled tab reopens the transcript paired with the current offline recording', async (t) => {
  const original = Object.getOwnPropertyDescriptor(navigator, 'serviceWorker');
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { controller: {} } });
  t.after(() => original ? Object.defineProperty(navigator, 'serviceWorker', original) : delete navigator.serviceWorker);
  const episode = { file: 'one.md', transcriptHash: 'current' };
  let script = 'Older downloaded recording';
  const fetchImpl = async () => new Response(script);
  assert.equal(await ensureEpisodeContent('show', episode, { fetchImpl }), script);
  script = 'Current cut after removing download';
  assert.equal(await ensureEpisodeContent('show', episode, { fetchImpl }), script);
  assert.equal(episode.content, script);
});

test('a failed transcript fetch resolves to null and can be retried', async () => {
  const episode = { id: 2, file: 'episode-02-y.md', transcriptHash: 'def' };
  assert.equal(await ensureEpisodeContent('s', episode, { fetchImpl: async () => { throw new Error('offline'); } }), null);
  assert.equal(await ensureEpisodeContent('s', episode, { fetchImpl: async () => ({ ok: false }) }), null);
  assert.equal(await ensureEpisodeContent('s', episode, { fetchImpl: async () => ({ ok: true, text: async () => 'ok' }) }), 'ok');
});

test('inline content (user-created shows) needs no fetch', async () => {
  const episode = { id: 1, content: 'inline' };
  assert.equal(await ensureEpisodeContent('s', episode, { fetchImpl: () => assert.fail('fetched') }), 'inline');
});

test('continue listening lists half-finished episodes across shows, newest first', () => {
  const podcasts = [
    { id: 'a', episodes: [{ id: 1 }, { id: 2 }] },
    { id: 'b', episodes: [{ id: 1 }] }
  ];
  const state = {
    episodeProgress: {
      'a-1': { percent: 40, timestamp: 100 },
      'a-2': { percent: 99, timestamp: 300 },
      'b-1': { percent: 10, timestamp: 200 }
    },
    completedEpisodes: []
  };
  const items = getContinueListening(podcasts, state);
  assert.deepEqual(items.map((i) => `${i.podcast.id}-${i.episode.id}`), ['b-1', 'a-1']);
});

test('built catalog carries metadata only, with transcripts and feeds alongside', { skip: !fs.existsSync(path.join(distDir, 'podcasts.js')) }, () => {
  const source = fs.readFileSync(path.join(distDir, 'podcasts.js'), 'utf8');
  const sandbox = {};
  new Function('window', source)(sandbox);
  const podcasts = sandbox.PODCASTS;
  assert.ok(podcasts.length > 0);
  for (const podcast of podcasts) {
    for (const episode of podcast.episodes) {
      assert.equal(episode.content, undefined, `${podcast.id}/${episode.file} still inlines its script`);
      assert.match(episode.transcriptHash, /^[0-9a-f]{12}$/);
      const transcript = path.join(distDir, 'transcripts', podcast.id, episode.file);
      assert.ok(fs.existsSync(transcript), `missing ${transcript}`);
    }
    if (podcast.feedUrl) {
      const feed = fs.readFileSync(path.join(distDir, podcast.feedUrl), 'utf8');
      assert.match(feed, /<itunes:block>yes<\/itunes:block>/);
      assert.match(feed, /<enclosure url="https:\/\/[^"]+\/combined\.mp3" length="\d+" type="audio\/mpeg"\/>/);
    }
  }
});
