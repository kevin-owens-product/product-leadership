import test from 'node:test';
import assert from 'node:assert/strict';

import {
  safeJSONParse,
  migrateState,
  getResumePosition,
  STATE_SCHEMA_VERSION,
  loadQueue,
  loadListeningStats
} from '../../src/state/storage.js';

test('resume prefers exact seconds, supports legacy lines, and honors explicit destinations', () => {
  const partial = { line: 11, positionSeconds: 2670.25, percent: 99, finished: false };
  assert.deepEqual(getResumePosition(partial, 12), { line: 11, seconds: 2670.25, finished: false });
  assert.deepEqual(getResumePosition(partial, 12, 2), { line: 2, seconds: null, finished: false });
  assert.deepEqual(getResumePosition({ line: 6, percent: 50 }, 12), { line: 6, seconds: null, finished: false });
  for (const saved of [{ ...partial, finished: true }, { line: 11, percent: 99 }]) {
    assert.deepEqual(getResumePosition(saved, 12), { line: 0, seconds: null, finished: true });
  }
  assert.deepEqual(getResumePosition({ line: 11, percent: 99, finished: false }, 12),
    { line: 11, seconds: null, finished: false });
});

test('safeJSONParse falls back on invalid json', () => {
  assert.deepEqual(safeJSONParse('{bad', { ok: false }), { ok: false });
});

test('migrateState normalizes malformed payload', () => {
  const state = migrateState({
    completedEpisodes: 'oops',
    episodeProgress: null,
    bookmarks: [],
    speechRate: 1.25,
    autoPlayNext: true,
    seasonSelections: {
      'ap-finance-mastery': 2,
      broken: 'two',
      zero: 0
    }
  });

  assert.equal(state.schemaVersion, STATE_SCHEMA_VERSION);
  assert.deepEqual(state.completedEpisodes, []);
  assert.deepEqual(state.episodeProgress, {});
  assert.deepEqual(state.bookmarks, {});
  assert.equal(state.speechRate, 1.25);
  assert.equal(state.autoPlayNext, true);
  assert.deepEqual(state.seasonSelections, { 'ap-finance-mastery': 2 });
});

test('migrateState defaults missing season selections', () => {
  assert.deepEqual(migrateState({}).seasonSelections, {});
});

test('loadQueue recovers from malformed localStorage data', () => {
  global.localStorage = {
    getItem: () => '{broken',
    setItem: () => {}
  };
  assert.deepEqual(loadQueue(), []);
  delete global.localStorage;
});

test('loadListeningStats recovers from malformed localStorage data', () => {
  global.localStorage = {
    getItem: () => '{broken',
    setItem: () => {}
  };
  const stats = loadListeningStats();
  assert.equal(stats.totalTime, 0);
  assert.equal(stats.episodesCompleted, 0);
  delete global.localStorage;
});
