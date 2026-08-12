import test from 'node:test';
import assert from 'node:assert/strict';

import { findAdjacentEpisode, findNextUp } from '../../src/state/queue-next.js';

const podcasts = [
  {
    id: 'forge',
    episodes: [{ id: 1 }, { id: 2 }, { id: 3 }]
  },
  {
    id: 'deadwater',
    episodes: [{ id: 1 }, { id: 2 }]
  }
];

test('first playable queue entry wins over the sequential episode', () => {
  const next = findNextUp({
    queue: [{ podcastId: 'deadwater', episodeNum: 2 }],
    podcasts,
    currentPodcastId: 'forge',
    currentEpisodeId: 1
  });
  assert.equal(next.podcast.id, 'deadwater');
  assert.equal(next.episode.id, 2);
  assert.equal(next.queueIndex, 0);
});

test('skips queue entries that no longer resolve to an episode', () => {
  const next = findNextUp({
    queue: [
      { podcastId: 'gone', episodeNum: 1 },
      { podcastId: 'forge', episodeNum: 99 },
      { podcastId: 'forge', episodeNum: 3 }
    ],
    podcasts,
    currentPodcastId: 'forge',
    currentEpisodeId: 1
  });
  assert.equal(next.episode.id, 3);
  assert.equal(next.queueIndex, 2);
});

test('skips the currently playing episode when it is queued', () => {
  const next = findNextUp({
    queue: [{ podcastId: 'forge', episodeNum: 2 }],
    podcasts,
    currentPodcastId: 'forge',
    currentEpisodeId: 2
  });
  // Falls through to the sequential episode after the current one.
  assert.equal(next.podcast.id, 'forge');
  assert.equal(next.episode.id, 3);
  assert.equal(next.queueIndex, -1);
});

test('falls back to the next sequential episode with an empty queue', () => {
  const next = findNextUp({
    queue: [],
    podcasts,
    currentPodcastId: 'forge',
    currentEpisodeId: 2
  });
  assert.equal(next.episode.id, 3);
  assert.equal(next.queueIndex, -1);
});

test('sequential playback crosses an explicit season boundary', () => {
  const seasonal = [{
    id: 'operator',
    seasons: [{ number: 1 }, { number: 2 }],
    episodes: [{ id: 8, season: 1 }, { id: 9, season: 2 }]
  }];
  const next = findNextUp({
    queue: [],
    podcasts: seasonal,
    currentPodcastId: 'operator',
    currentEpisodeId: 8
  });
  assert.equal(next.episode.id, 9);
  assert.equal(next.episode.season, 2);
});

test('manifest order drives next and previous playback across non-contiguous ids', () => {
  const seasonal = {
    id: 'future-season',
    seasons: [{ number: 1 }, { number: 2 }],
    episodes: [{ id: 8, season: 1 }, { id: 101, season: 2 }]
  };
  const next = findNextUp({
    queue: [],
    podcasts: [seasonal],
    currentPodcastId: 'future-season',
    currentEpisodeId: 8
  });
  assert.equal(next.episode.id, 101);
  assert.equal(findAdjacentEpisode(seasonal, 101, -1).id, 8);
});

test('returns null at the end of a show with nothing queued', () => {
  assert.equal(
    findNextUp({ queue: [], podcasts, currentPodcastId: 'forge', currentEpisodeId: 3 }),
    null
  );
});

test('returns null when nothing is playing and the queue is empty', () => {
  assert.equal(findNextUp({ queue: [], podcasts }), null);
});
