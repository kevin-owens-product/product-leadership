import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

import {
  createTranscriptFollow,
  PROGRAMMATIC_SCROLL_WINDOW_MS
} from '../../src/ui/transcript-follow.js';

function makeHarness({ now } = {}) {
  const dom = new JSDOM(`
    <div id="content"></div>
    <button id="pill" hidden>Resync</button>
  `);
  const container = dom.window.document.getElementById('content');
  const pill = dom.window.document.getElementById('pill');
  let resyncs = 0;
  const follow = createTranscriptFollow({
    container,
    pill,
    onResync: () => { resyncs++; },
    ...(now ? { now } : {})
  });
  follow.bind();
  return { dom, container, pill, follow, getResyncs: () => resyncs };
}

test('starts in follow mode with the pill hidden', () => {
  const { follow, pill } = makeHarness();
  assert.equal(follow.isFollowing(), true);
  assert.equal(pill.hidden, true);
});

test('wheel and touchmove suspend following and reveal the pill', () => {
  for (const type of ['wheel', 'touchmove']) {
    const { dom, container, pill, follow } = makeHarness();
    container.dispatchEvent(new dom.window.Event(type));
    assert.equal(follow.isFollowing(), false, `${type} should suspend`);
    assert.equal(pill.hidden, false, `${type} should reveal the pill`);
  }
});

test('scroll inside the programmatic window is ignored; outside it suspends', () => {
  let t = 1000;
  const { dom, container, follow } = makeHarness({ now: () => t });

  follow.notifyAutoScroll(); // our own smooth scroll starts
  t += PROGRAMMATIC_SCROLL_WINDOW_MS - 1;
  container.dispatchEvent(new dom.window.Event('scroll'));
  assert.equal(follow.isFollowing(), true, 'programmatic scroll must not suspend');

  t += 2; // window elapsed — the next scroll is the user's
  container.dispatchEvent(new dom.window.Event('scroll'));
  assert.equal(follow.isFollowing(), false);
});

test('resync re-enables following, hides the pill, and notifies the caller', () => {
  const { dom, container, pill, follow, getResyncs } = makeHarness();
  container.dispatchEvent(new dom.window.Event('wheel'));
  assert.equal(follow.isFollowing(), false);

  follow.resync();
  assert.equal(follow.isFollowing(), true);
  assert.equal(pill.hidden, true);
  assert.equal(getResyncs(), 1);
});

test('resync opens a programmatic window so its own scroll does not re-suspend', () => {
  let t = 5000;
  const { dom, container, follow } = makeHarness({ now: () => t });
  container.dispatchEvent(new dom.window.Event('wheel'));
  follow.resync();
  t += 50; // the smooth scroll triggered by resync fires scroll events
  container.dispatchEvent(new dom.window.Event('scroll'));
  assert.equal(follow.isFollowing(), true);
});

test('clicking the pill resyncs', () => {
  const { dom, container, pill, follow, getResyncs } = makeHarness();
  container.dispatchEvent(new dom.window.Event('wheel'));
  pill.dispatchEvent(new dom.window.Event('click'));
  assert.equal(follow.isFollowing(), true);
  assert.equal(pill.hidden, true);
  assert.equal(getResyncs(), 1);
});

test('suspend is idempotent and tolerates missing pill/container', () => {
  const follow = createTranscriptFollow({ onResync: () => {} });
  follow.bind(); // no container, no pill — must not throw
  assert.equal(follow.isFollowing(), true);
  follow.suspend();
  follow.suspend();
  assert.equal(follow.isFollowing(), false);
  follow.resync();
  assert.equal(follow.isFollowing(), true);
});
