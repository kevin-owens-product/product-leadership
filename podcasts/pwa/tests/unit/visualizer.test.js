import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

import {
  computeBarLevels,
  barStyleForLevel,
  createNowPlayingVisualizer
} from '../../src/playback/visualizer.js';

// ---- pure helpers ----

test('computeBarLevels returns zeros for empty/missing data', () => {
  assert.deepEqual(computeBarLevels(null, 4), [0, 0, 0, 0]);
  assert.deepEqual(computeBarLevels(new Uint8Array(0), 3), [0, 0, 0]);
});

test('computeBarLevels maps uniform spectrum to uniform levels', () => {
  const data = new Uint8Array(64).fill(255);
  const levels = computeBarLevels(data, 8, null, 0);
  assert.equal(levels.length, 8);
  for (const l of levels) {
    assert.ok(Math.abs(l - 1) < 1e-9, `expected 1, got ${l}`);
  }
});

test('computeBarLevels smooths against previous levels', () => {
  const data = new Uint8Array(64).fill(255);
  const prev = new Array(4).fill(0);
  const levels = computeBarLevels(data, 4, prev, 0.5);
  for (const l of levels) {
    assert.ok(Math.abs(l - 0.5) < 1e-9, `expected 0.5, got ${l}`);
  }
});

test('barStyleForLevel uses transform/opacity only and clamps', () => {
  const rest = barStyleForLevel(0);
  assert.equal(rest.transform, 'scaleY(0.120)');
  assert.equal(rest.opacity, '0.300');
  const full = barStyleForLevel(1);
  assert.equal(full.transform, 'scaleY(1.000)');
  assert.equal(full.opacity, '0.900');
  assert.equal(barStyleForLevel(5).transform, 'scaleY(1.000)');
  assert.equal(barStyleForLevel(-3).transform, 'scaleY(0.120)');
  assert.equal(barStyleForLevel('nope').transform, 'scaleY(0.120)');
});

// ---- factory with a fake AudioContext ----

function makeFakeCtxCtor(overrides = {}) {
  const created = [];
  class FakeCtx {
    constructor() {
      this.state = 'suspended';
      this.resumeCalls = 0;
      this.destination = { name: 'destination' };
      created.push(this);
    }
    resume() {
      this.resumeCalls++;
      this.state = 'running';
      return Promise.resolve();
    }
    createMediaElementSource(el) {
      this.sourceElement = el;
      this.source = { connectedTo: [], connect(node) { this.connectedTo.push(node); } };
      return this.source;
    }
    createAnalyser() {
      if (overrides.analyserThrows) throw new Error('no analyser here');
      this.analyser = {
        fftSize: 0,
        smoothingTimeConstant: 0,
        frequencyBinCount: 32,
        connectedTo: [],
        connect(node) { this.connectedTo.push(node); },
        getByteFrequencyData(arr) { arr.fill(overrides.freqValue ?? 255); }
      };
      return this.analyser;
    }
  }
  return { FakeCtx, created };
}

function makeHarness({ reduced = false, overrides } = {}) {
  const dom = new JSDOM('<div id="viz"></div>');
  const container = dom.window.document.getElementById('viz');
  const audio = { paused: false };
  const { FakeCtx, created } = makeFakeCtxCtor(overrides);
  const frames = [];
  const viz = createNowPlayingVisualizer({
    audio,
    container,
    barCount: 4,
    prefersReducedMotion: () => reduced,
    getAudioContextCtor: () => FakeCtx,
    requestFrame: (cb) => { frames.push(cb); return frames.length; },
    cancelFrame: () => {}
  });
  return { viz, container, audio, created, frames };
}

test('ensureContext wires source -> analyser -> destination and builds bars', () => {
  const { viz, container, audio, created } = makeHarness();
  assert.equal(viz.ensureContext(), true);
  assert.equal(created.length, 1);
  const ctx = created[0];
  assert.equal(ctx.sourceElement, audio);
  assert.deepEqual(ctx.source.connectedTo, [ctx.analyser]);
  assert.deepEqual(ctx.analyser.connectedTo, [ctx.destination]);
  assert.ok(ctx.resumeCalls >= 1, 'resumes the fresh (suspended) context');
  assert.equal(container.querySelectorAll('.viz-bar').length, 4);
  // Idempotent: second call reuses the context.
  assert.equal(viz.ensureContext(), true);
  assert.equal(created.length, 1);
});

test('ensureContext is a no-op under prefers-reduced-motion', () => {
  const { viz, container, created } = makeHarness({ reduced: true });
  assert.equal(viz.ensureContext(), false);
  assert.equal(created.length, 0);
  assert.equal(container.querySelectorAll('.viz-bar').length, 0);
  assert.equal(viz.hasContext(), false);
});

test('wiring failure falls back to direct source->destination routing', () => {
  const { viz, created } = makeHarness({ overrides: { analyserThrows: true } });
  assert.equal(viz.ensureContext(), false);
  assert.equal(viz.isSupported(), false);
  const ctx = created[0];
  // Audio must never be left silenced: the orphaned source is rerouted.
  assert.deepEqual(ctx.source.connectedTo, [ctx.destination]);
  // Later start() calls stay inert.
  viz.start();
  assert.equal(viz.isRunning(), false);
});

test('start drives transform/opacity-only frames; stop rests the bars', () => {
  const { viz, container, frames } = makeHarness();
  viz.ensureContext();
  viz.start();
  assert.equal(viz.isRunning(), true);
  assert.ok(container.classList.contains('live'));
  assert.equal(frames.length, 1);
  frames[0](); // run one animation frame
  const bars = [...container.querySelectorAll('.viz-bar')];
  for (const bar of bars) {
    assert.match(bar.style.transform, /^scaleY\(/);
    assert.ok(parseFloat(bar.style.opacity) > 0.3, 'loud signal raises opacity');
    assert.notEqual(bar.style.transform, 'scaleY(0.120)');
  }
  assert.equal(frames.length, 2, 'schedules the next frame');

  viz.stop();
  assert.equal(viz.isRunning(), false);
  assert.ok(!container.classList.contains('live'));
  for (const bar of bars) {
    assert.equal(bar.style.transform, 'scaleY(0.120)');
    assert.equal(parseFloat(bar.style.opacity), 0.3);
  }
  // Queued frame is a no-op after stop.
  frames[1]();
  assert.equal(frames.length, 2);
});

test('resumeIfNeeded resumes a non-running context', async () => {
  const { viz, created } = makeHarness();
  viz.ensureContext();
  const ctx = created[0];
  ctx.state = 'interrupted'; // iOS phone-call / lock state
  const before = ctx.resumeCalls;
  viz.resumeIfNeeded();
  assert.equal(ctx.resumeCalls, before + 1);
  assert.equal(ctx.state, 'running');
  // No-op while already running.
  viz.resumeIfNeeded();
  assert.equal(ctx.resumeCalls, before + 1);
});

test('missing AudioContext support marks the visualizer unsupported', () => {
  const dom = new JSDOM('<div id="viz"></div>');
  const viz = createNowPlayingVisualizer({
    audio: { paused: true },
    container: dom.window.document.getElementById('viz'),
    prefersReducedMotion: () => false,
    getAudioContextCtor: () => undefined
  });
  assert.equal(viz.ensureContext(), false);
  assert.equal(viz.isSupported(), false);
});
