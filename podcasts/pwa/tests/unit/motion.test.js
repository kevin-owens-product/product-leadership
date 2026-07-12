import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

import {
  prefersReducedMotion,
  transitionViews,
  morphViews,
  formatSkipDelta,
  spawnRipple,
  showSkipFlyout
} from '../../src/ui/motion.js';

function fakeWin(reduced) {
  return {
    matchMedia: (query) => ({
      matches: reduced && query.includes('prefers-reduced-motion'),
      media: query
    })
  };
}

test('prefersReducedMotion reflects the media query and tolerates missing matchMedia', () => {
  assert.equal(prefersReducedMotion(fakeWin(true)), true);
  assert.equal(prefersReducedMotion(fakeWin(false)), false);
  assert.equal(prefersReducedMotion({}), false);
  assert.equal(prefersReducedMotion({ matchMedia: () => { throw new Error('boom'); } }), false);
});

test('formatSkipDelta renders signed second labels', () => {
  assert.equal(formatSkipDelta(-30), '−30s');
  assert.equal(formatSkipDelta(10), '+10s');
  assert.equal(formatSkipDelta(0), '+0s');
  assert.equal(formatSkipDelta('nope'), '+0s');
});

test('transitionViews uses startViewTransition when supported and motion is allowed', () => {
  let applied = false;
  let viaTransition = false;
  const doc = {
    startViewTransition(cb) { viaTransition = true; cb(); },
    defaultView: fakeWin(false)
  };
  const started = transitionViews(() => { applied = true; }, doc);
  assert.equal(started, true);
  assert.equal(viaTransition, true);
  assert.equal(applied, true);
});

test('transitionViews falls back to a direct swap without support', () => {
  let applied = false;
  const doc = { defaultView: fakeWin(false) };
  const started = transitionViews(() => { applied = true; }, doc);
  assert.equal(started, false);
  assert.equal(applied, true);
});

test('transitionViews skips the transition under prefers-reduced-motion', () => {
  let applied = false;
  let viaTransition = false;
  const doc = {
    startViewTransition(cb) { viaTransition = true; cb(); },
    defaultView: fakeWin(true)
  };
  const started = transitionViews(() => { applied = true; }, doc);
  assert.equal(started, false);
  assert.equal(viaTransition, false);
  assert.equal(applied, true);
});

test('morphViews tags source before capture and destination after apply, then cleans up', async () => {
  let applied = false;
  const from = { style: {} };
  const to = { style: {} };
  let finishedResolve;
  const finished = new Promise((r) => { finishedResolve = r; });
  const doc = {
    startViewTransition(cb) {
      // Source must carry the shared name when the old state is captured.
      assert.equal(from.style.viewTransitionName, 'hero-art');
      cb();
      return { finished };
    },
    defaultView: fakeWin(false)
  };
  const started = morphViews(() => { applied = true; }, { from, to: () => to }, doc);
  assert.equal(started, true);
  assert.equal(applied, true);
  // Source name released before the new state; destination tagged after apply.
  assert.equal(from.style.viewTransitionName, '');
  assert.equal(to.style.viewTransitionName, 'hero-art');
  finishedResolve();
  await finished;
  await new Promise((r) => setImmediate(r));
  assert.equal(to.style.viewTransitionName, '');
});

test('morphViews falls back to an instant swap without support or under reduced motion', () => {
  let applied = 0;
  const from = { style: {} };
  assert.equal(
    morphViews(() => { applied += 1; }, { from }, { defaultView: fakeWin(false) }),
    false
  );
  const reducedDoc = {
    startViewTransition() { throw new Error('must not start under reduced motion'); },
    defaultView: fakeWin(true)
  };
  assert.equal(morphViews(() => { applied += 1; }, { from }, reducedDoc), false);
  assert.equal(applied, 2);
  // Fallback paths never touch the elements.
  assert.equal(from.style.viewTransitionName, undefined);
});

test('spawnRipple appends a self-removing ripple inside the button', () => {
  const dom = new JSDOM('<button id="b">skip</button>');
  const btn = dom.window.document.getElementById('b');
  const ripple = spawnRipple(btn, { clientX: 12, clientY: 8 });
  assert.ok(ripple);
  assert.equal(ripple.className, 'skip-ripple');
  assert.equal(btn.contains(ripple), true);
  ripple.dispatchEvent(new dom.window.Event('animationend'));
  assert.equal(btn.contains(ripple), false);
});

test('spawnRipple is a no-op under prefers-reduced-motion', () => {
  const dom = new JSDOM('<button id="b">skip</button>');
  dom.window.matchMedia = (q) => ({ matches: q.includes('prefers-reduced-motion'), media: q });
  const btn = dom.window.document.getElementById('b');
  assert.equal(spawnRipple(btn, { clientX: 1, clientY: 1 }), null);
  assert.equal(btn.querySelector('.skip-ripple'), null);
});

test('showSkipFlyout floats a signed seconds label above the button', () => {
  const dom = new JSDOM('<button id="b">skip</button>');
  const btn = dom.window.document.getElementById('b');
  const fly = showSkipFlyout(btn, -30);
  assert.ok(fly);
  assert.equal(fly.className, 'skip-flyout');
  assert.equal(fly.textContent, '−30s');
  assert.equal(dom.window.document.body.contains(fly), true);
  fly.dispatchEvent(new dom.window.Event('animationend'));
  assert.equal(dom.window.document.body.contains(fly), false);
});

test('showSkipFlyout is a no-op under prefers-reduced-motion', () => {
  const dom = new JSDOM('<button id="b">skip</button>');
  dom.window.matchMedia = (q) => ({ matches: q.includes('prefers-reduced-motion'), media: q });
  const btn = dom.window.document.getElementById('b');
  assert.equal(showSkipFlyout(btn, 10), null);
  assert.equal(dom.window.document.querySelector('.skip-flyout'), null);
});
