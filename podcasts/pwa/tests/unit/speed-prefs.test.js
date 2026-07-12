import test from 'node:test';
import assert from 'node:assert/strict';

import {
  clampSpeed,
  getShowSpeed,
  setShowSpeed,
  SPEED_PREFS_KEY,
  MIN_SPEED,
  MAX_SPEED
} from '../../src/state/speed-prefs.js';

function mockStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    dump: () => Object.fromEntries(map)
  };
}

test('clampSpeed clamps to 0.5–4 and snaps to the 0.1 grid', () => {
  assert.equal(clampSpeed(1.5), 1.5);
  assert.equal(clampSpeed(0.1), MIN_SPEED);
  assert.equal(clampSpeed(9), MAX_SPEED);
  assert.equal(clampSpeed(1.7000000000000002), 1.7);
  assert.equal(clampSpeed('2.3'), 2.3);
  assert.equal(clampSpeed('garbage'), 1);
  assert.equal(clampSpeed(undefined, 1.5), 1.5);
});

test('setShowSpeed / getShowSpeed round-trip per show', () => {
  const storage = mockStorage();
  setShowSpeed('show-a', 1.8, storage);
  setShowSpeed('show-b', 0.9, storage);
  assert.equal(getShowSpeed('show-a', 1, storage), 1.8);
  assert.equal(getShowSpeed('show-b', 1, storage), 0.9);
  assert.equal(getShowSpeed('show-c', 1.2, storage), 1.2); // unknown → fallback
});

test('getShowSpeed falls back on corrupt or non-numeric stored data', () => {
  const storage = mockStorage({ [SPEED_PREFS_KEY]: 'not json {' });
  assert.equal(getShowSpeed('show-a', 1.3, storage), 1.3);

  const storage2 = mockStorage({ [SPEED_PREFS_KEY]: JSON.stringify({ 'show-a': 'fast' }) });
  assert.equal(getShowSpeed('show-a', 1, storage2), 1);

  const storage3 = mockStorage({ [SPEED_PREFS_KEY]: JSON.stringify(['not', 'a', 'map']) });
  assert.equal(getShowSpeed('show-a', 1, storage3), 1);
});

test('setShowSpeed clamps out-of-range rates and preserves other shows', () => {
  const storage = mockStorage({ [SPEED_PREFS_KEY]: JSON.stringify({ existing: 2 }) });
  setShowSpeed('show-a', 99, storage);
  const map = JSON.parse(storage.dump()[SPEED_PREFS_KEY]);
  assert.equal(map['show-a'], MAX_SPEED);
  assert.equal(map.existing, 2);
});

test('missing podcastId is a no-op / returns fallback', () => {
  const storage = mockStorage();
  setShowSpeed('', 2, storage);
  assert.equal(storage.dump()[SPEED_PREFS_KEY], undefined);
  assert.equal(getShowSpeed('', 1.4, storage), 1.4);
});
