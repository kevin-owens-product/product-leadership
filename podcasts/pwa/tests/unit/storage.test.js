import test from 'node:test';
import assert from 'node:assert/strict';

import {
  safeJSONParse,
  migrateState,
  STATE_SCHEMA_VERSION,
  loadQueue,
  loadListeningStats
} from '../../src/state/storage.js';

test('safeJSONParse falls back on invalid json', () => {
  assert.deepEqual(safeJSONParse('{bad', { ok: false }), { ok: false });
});

test('migrateState normalizes malformed payload', () => {
  const state = migrateState({
    completedEpisodes: 'oops',
    episodeProgress: null,
    bookmarks: [],
    speechRate: 1.25,
    autoPlayNext: true
  });

  assert.equal(state.schemaVersion, STATE_SCHEMA_VERSION);
  assert.deepEqual(state.completedEpisodes, []);
  assert.deepEqual(state.episodeProgress, {});
  assert.deepEqual(state.bookmarks, {});
  assert.equal(state.speechRate, 1.25);
  assert.equal(state.autoPlayNext, true);
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
