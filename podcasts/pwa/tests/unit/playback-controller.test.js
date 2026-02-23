import test from 'node:test';
import assert from 'node:assert/strict';

import { createPlaybackSessionController } from '../../src/playback/controller.js';

test('playback session controller invalidates previous sessions', () => {
  const controller = createPlaybackSessionController();
  const a = controller.createSession();
  const b = controller.createSession();

  assert.equal(controller.isActive(a), false);
  assert.equal(controller.isActive(b), true);

  controller.invalidate();
  assert.equal(controller.isActive(b), false);
});
