import test from 'node:test';
import assert from 'node:assert/strict';

import {
  SLEEP_FADE_SECONDS,
  sleepFadeVolume,
  sleepRemainingSeconds
} from '../../src/playback/sleep-timer.js';

test('sleepFadeVolume is 1 outside the fade window', () => {
  assert.equal(sleepFadeVolume(Infinity), 1);
  assert.equal(sleepFadeVolume(SLEEP_FADE_SECONDS), 1);
  assert.equal(sleepFadeVolume(120), 1);
});

test('sleepFadeVolume ramps linearly down to 0 inside the window', () => {
  assert.equal(sleepFadeVolume(10), 0.5);
  assert.equal(sleepFadeVolume(5), 0.25);
  assert.equal(sleepFadeVolume(0), 0);
  assert.equal(sleepFadeVolume(-3), 0);
});

test('sleepFadeVolume honors a custom fade window', () => {
  assert.equal(sleepFadeVolume(5, 10), 0.5);
  assert.equal(sleepFadeVolume(10, 10), 1);
});

test('sleepRemainingSeconds counts down a minute timer in real time', () => {
  const now = 1_000_000;
  assert.equal(sleepRemainingSeconds({ endTime: now + 90_000, now }), 90);
  assert.equal(sleepRemainingSeconds({ endTime: now - 1, now }), 0);
});

test('sleepRemainingSeconds converts end-of-episode through playback rate', () => {
  const args = { atEpisodeEnd: true, positionSeconds: 100, durationSeconds: 160 };
  assert.equal(sleepRemainingSeconds({ ...args, playbackRate: 1 }), 60);
  assert.equal(sleepRemainingSeconds({ ...args, playbackRate: 2 }), 30);
  // Rates below the supported floor are clamped like the player clamps them.
  assert.equal(sleepRemainingSeconds({ ...args, playbackRate: 0.1 }), 120);
});

test('sleepRemainingSeconds is Infinity when no timer is set', () => {
  assert.equal(sleepRemainingSeconds({}), Infinity);
  // End-of-episode with no usable duration (chunked fallback) — no fade,
  // playback stops on the natural ended event instead.
  assert.equal(sleepRemainingSeconds({ atEpisodeEnd: true, durationSeconds: 0 }), Infinity);
});

test('a minute timer takes precedence over end-of-episode', () => {
  const now = 5_000;
  const remaining = sleepRemainingSeconds({
    endTime: now + 30_000,
    atEpisodeEnd: true,
    now,
    positionSeconds: 0,
    durationSeconds: 600
  });
  assert.equal(remaining, 30);
});
