import test from 'node:test';
import assert from 'node:assert/strict';

import { classifyContinuousAudioFailure } from '../../src/playback/audio-errors.js';

test('continuous audio retries network and aborted loads', () => {
  assert.equal(classifyContinuousAudioFailure({ code: 1 }), 'retry');
  assert.equal(classifyContinuousAudioFailure({ code: 2 }), 'retry');
  assert.equal(classifyContinuousAudioFailure({ name: 'AbortError' }), 'retry');
  assert.equal(classifyContinuousAudioFailure({ name: 'NetworkError' }), 'retry');
});

test('continuous audio falls back only for decode or unsupported sources', () => {
  assert.equal(classifyContinuousAudioFailure({ code: 3 }), 'fallback');
  assert.equal(classifyContinuousAudioFailure({ code: 4 }), 'fallback');
  assert.equal(classifyContinuousAudioFailure({ name: 'NotSupportedError' }), 'fallback');
});

test('continuous audio keeps autoplay-policy failures user actionable', () => {
  assert.equal(classifyContinuousAudioFailure({ name: 'NotAllowedError' }), 'gesture');
});
