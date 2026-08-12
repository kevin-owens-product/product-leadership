import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getPodcastSeasons,
  getSeasonListeningAction,
  getSeasonStats,
  resolveSeasonNumber,
  seasonNumberForEpisode
} from '../../src/ui/seasons.js';

const podcast = {
  id: 'operator',
  seasons: [
    { number: 1, title: 'Company Operator', description: 'One company.' },
    { number: 2, title: 'Portfolio Control', description: 'Three companies.' }
  ],
  episodes: [
    { id: 1, season: 1, title: 'One', durationSeconds: 100 },
    { id: 2, season: 1, title: 'Two', durationSeconds: 200 },
    { id: 3, season: 2, title: 'Three', durationSeconds: 300 },
    { id: 4, season: 2, title: 'Four', durationSeconds: 400 }
  ]
};

test('legacy shows remain a flat list', () => {
  assert.deepEqual(getPodcastSeasons({ id: 'legacy', episodes: [{ id: 1 }] }), []);
});

test('season definitions retain explicit membership and global episode ids', () => {
  const seasons = getPodcastSeasons(podcast);
  assert.deepEqual(seasons.map((season) => season.number), [1, 2]);
  assert.deepEqual(seasons[0].episodes.map((episode) => episode.id), [1, 2]);
  assert.deepEqual(seasons[1].episodes.map((episode) => episode.id), [3, 4]);
  assert.equal(seasonNumberForEpisode(podcast, 4), 2);
});

test('season selection prioritizes explicit and playback context', () => {
  const state = { seasonSelections: { operator: 1 } };
  assert.equal(resolveSeasonNumber({ podcast, state, preferredSeason: 2 }), 2);
  assert.equal(resolveSeasonNumber({
    podcast,
    state,
    playback: { podcastId: 'operator', episodeId: 3 }
  }), 2);
  assert.equal(resolveSeasonNumber({
    podcast,
    state,
    playback: { podcastId: 'another-show', episodeId: 3 }
  }), 1);
});

test('selection falls back to current or in-progress episode without a remembered season', () => {
  assert.equal(resolveSeasonNumber({
    podcast,
    state: { currentPodcastId: 'operator', currentEpisodeId: 3 }
  }), 2);

  assert.equal(resolveSeasonNumber({
    podcast,
    state: {
      episodeProgress: {
        'operator-3': { percent: 25, timestamp: 200 },
        'operator-2': { percent: 20, timestamp: 100 }
      }
    }
  }), 2);
});

test('an explicit remembered season survives stale episode history', () => {
  assert.equal(resolveSeasonNumber({
    podcast,
    state: {
      currentPodcastId: 'operator',
      currentEpisodeId: 1,
      seasonSelections: { operator: 2 },
      episodeProgress: { 'operator-1': { percent: 25, timestamp: 100 } }
    }
  }), 2);
});

test('fresh listeners start at the first incomplete season and graduates move forward', () => {
  assert.equal(resolveSeasonNumber({ podcast, state: {} }), 1);
  assert.equal(resolveSeasonNumber({
    podcast,
    state: { completedEpisodes: ['operator-1', 'operator-2'] }
  }), 2);
  assert.equal(resolveSeasonNumber({
    podcast,
    state: { completedEpisodes: ['operator-1', 'operator-2', 'operator-3', 'operator-4'] }
  }), 2);
});

test('season stats combine completion, partial progress, and duration', () => {
  const seasons = getPodcastSeasons(podcast);
  const stats = getSeasonStats('operator', seasons[0].episodes, {
    completedEpisodes: ['operator-1'],
    episodeProgress: { 'operator-2': { percent: 50 } }
  });
  assert.deepEqual(stats, { total: 2, completed: 1, percent: 75, durationSeconds: 300 });
});

test('continue action prefers latest in-progress episode then crosses season boundary', () => {
  const seasons = getPodcastSeasons(podcast);
  const continuing = getSeasonListeningAction({
    podcast,
    seasons,
    selectedSeason: 1,
    state: {
      episodeProgress: {
        'operator-1': { percent: 30, timestamp: 10 },
        'operator-2': { percent: 20, timestamp: 20 }
      }
    }
  });
  assert.equal(continuing.kind, 'continue');
  assert.equal(continuing.episode.id, 2);

  const nextSeason = getSeasonListeningAction({
    podcast,
    seasons,
    selectedSeason: 1,
    state: { completedEpisodes: ['operator-1', 'operator-2'] }
  });
  assert.equal(nextSeason.kind, 'start');
  assert.equal(nextSeason.season.number, 2);
  assert.equal(nextSeason.episode.id, 3);

  const laterInProgress = getSeasonListeningAction({
    podcast,
    seasons,
    selectedSeason: 1,
    state: {
      completedEpisodes: ['operator-1', 'operator-2'],
      episodeProgress: { 'operator-3': { percent: 40, timestamp: 30 } }
    }
  });
  assert.equal(laterInProgress.kind, 'continue');
  assert.equal(laterInProgress.episode.id, 3);
});

test('continue action distinguishes a completed series from one completed season', () => {
  const seasons = getPodcastSeasons(podcast);
  const completedSeason = getSeasonListeningAction({
    podcast,
    seasons,
    selectedSeason: 2,
    state: { completedEpisodes: ['operator-3', 'operator-4'] }
  });
  assert.equal(completedSeason.kind, 'complete');

  const completedSeries = getSeasonListeningAction({
    podcast,
    seasons,
    selectedSeason: 2,
    state: { completedEpisodes: ['operator-1', 'operator-2', 'operator-3', 'operator-4'] }
  });
  assert.equal(completedSeries.kind, 'series-complete');
});
