import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

import { createNowPlayingVisualizer } from '../../src/playback/visualizer.js';

function makeHarness({ reduced = false, barCount = 4 } = {}) {
  const dom = new JSDOM('<div id="viz"></div>');
  const container = dom.window.document.getElementById('viz');
  const viz = createNowPlayingVisualizer({
    container,
    barCount,
    prefersReducedMotion: () => reduced
  });
  return { viz, container };
}

test('start builds deterministic CSS-only bars without an AudioContext', () => {
  const originalAudioContext = globalThis.AudioContext;
  let audioContextConstructions = 0;
  globalThis.AudioContext = class {
    constructor() { audioContextConstructions += 1; }
  };
  try {
    const { viz, container } = makeHarness();
    viz.start();
    const bars = [...container.querySelectorAll('.viz-bar')];
    assert.equal(bars.length, 4);
    assert.equal(audioContextConstructions, 0);
    assert.equal(viz.hasContext(), false);
    assert.equal(viz.isRunning(), true);
    assert.ok(container.classList.contains('live'));
    for (const bar of bars) {
      assert.match(bar.style.getPropertyValue('--viz-delay'), /^-?\d+ms$/);
      assert.match(bar.style.getPropertyValue('--viz-duration'), /^\d+ms$/);
      assert.match(bar.style.getPropertyValue('--viz-peak'), /^0\.\d{2}$/);
    }
  } finally {
    globalThis.AudioContext = originalAudioContext;
  }
});

test('start is idempotent and stop returns the halo to rest', () => {
  const { viz, container } = makeHarness();
  viz.start();
  viz.start();
  assert.equal(container.querySelectorAll('.viz-bar').length, 4);
  viz.stop();
  assert.equal(viz.isRunning(), false);
  assert.ok(!container.classList.contains('live'));
});

test('reduced motion leaves the visualizer inert', () => {
  const { viz, container } = makeHarness({ reduced: true });
  viz.start();
  assert.equal(container.querySelectorAll('.viz-bar').length, 0);
  assert.equal(viz.isRunning(), false);
  assert.equal(viz.isSupported(), false);
  assert.equal(viz.hasContext(), false);
});

test('a missing container is unsupported and safe', () => {
  const viz = createNowPlayingVisualizer({ container: null });
  viz.start();
  viz.stop();
  assert.equal(viz.isRunning(), false);
  assert.equal(viz.isSupported(), false);
  assert.equal(viz.hasContext(), false);
});
