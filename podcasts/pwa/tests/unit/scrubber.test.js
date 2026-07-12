import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

import {
  clamp01,
  fractionFromClientX,
  scrubKeyAction,
  bufferedEndFraction,
  formatScrubTime,
  createScrubber
} from '../../src/ui/scrubber.js';

test('clamp01 clamps and rejects non-finite input', () => {
  assert.equal(clamp01(0.5), 0.5);
  assert.equal(clamp01(-1), 0);
  assert.equal(clamp01(2), 1);
  assert.equal(clamp01(NaN), 0);
  assert.equal(clamp01('nope'), 0);
});

test('fractionFromClientX maps pointer x onto the bar rect', () => {
  const rect = { left: 100, width: 200 };
  assert.equal(fractionFromClientX(100, rect), 0);
  assert.equal(fractionFromClientX(200, rect), 0.5);
  assert.equal(fractionFromClientX(300, rect), 1);
  assert.equal(fractionFromClientX(400, rect), 1); // clamped past the end
  assert.equal(fractionFromClientX(0, rect), 0);   // clamped before the start
  assert.equal(fractionFromClientX(150, { left: 0, width: 0 }), 0); // degenerate rect
});

test('scrubKeyAction maps arrows to fine seeks and Home/End to edges', () => {
  assert.deepEqual(scrubKeyAction('ArrowRight'), { type: 'nudge', seconds: 5 });
  assert.deepEqual(scrubKeyAction('ArrowLeft'), { type: 'nudge', seconds: -5 });
  assert.deepEqual(scrubKeyAction('ArrowUp'), { type: 'nudge', seconds: 5 });
  assert.deepEqual(scrubKeyAction('ArrowDown'), { type: 'nudge', seconds: -5 });
  assert.deepEqual(scrubKeyAction('ArrowRight', true), { type: 'nudge', seconds: 1 });
  assert.deepEqual(scrubKeyAction('ArrowLeft', true), { type: 'nudge', seconds: -1 });
  assert.deepEqual(scrubKeyAction('Home'), { type: 'fraction', fraction: 0 });
  assert.deepEqual(scrubKeyAction('End'), { type: 'fraction', fraction: 1 });
  assert.equal(scrubKeyAction('Enter'), null);
  assert.equal(scrubKeyAction(' '), null);
});

function fakeTimeRanges(ranges) {
  return {
    length: ranges.length,
    start: (i) => ranges[i][0],
    end: (i) => ranges[i][1]
  };
}

test('bufferedEndFraction returns the end of the range containing currentTime', () => {
  const buffered = fakeTimeRanges([[0, 120], [300, 400]]);
  assert.equal(bufferedEndFraction(buffered, 600, 60), 0.2);
  assert.equal(bufferedEndFraction(buffered, 600, 350), 400 / 600);
  // currentTime in an unbuffered gap
  assert.equal(bufferedEndFraction(buffered, 600, 200), 0);
});

test('bufferedEndFraction handles empty/invalid input', () => {
  assert.equal(bufferedEndFraction(null, 600, 0), 0);
  assert.equal(bufferedEndFraction(fakeTimeRanges([]), 600, 0), 0);
  assert.equal(bufferedEndFraction(fakeTimeRanges([[0, 10]]), 0, 0), 0);
  assert.equal(bufferedEndFraction(fakeTimeRanges([[0, 9999]]), 600, 0), 1); // clamped
});

test('formatScrubTime formats mm:ss and h:mm:ss', () => {
  assert.equal(formatScrubTime(0), '0:00');
  assert.equal(formatScrubTime(65), '1:05');
  assert.equal(formatScrubTime(3600), '1:00:00');
  assert.equal(formatScrubTime(3725), '1:02:05');
  assert.equal(formatScrubTime(-5), '0:00');
  assert.equal(formatScrubTime(NaN), '0:00');
});

// --- DOM-level tests via jsdom ---

function buildScrubberDom() {
  const dom = new JSDOM('<div id="bar"><div id="fill"></div><div id="handle"></div><div id="bubble" hidden></div></div>');
  const { document } = dom.window;
  const bar = document.getElementById('bar');
  bar.getBoundingClientRect = () => ({ left: 0, width: 100, top: 0, height: 8 });
  return { dom, document, bar };
}

function pointerEvent(dom, type, clientX) {
  return new dom.window.MouseEvent(type, { clientX, bubbles: true });
}

test('createScrubber: drag previews and commits the released fraction', () => {
  const { dom, document, bar } = buildScrubberDom();
  const commits = [];
  const scrubber = createScrubber({
    bar,
    fill: document.getElementById('fill'),
    handle: document.getElementById('handle'),
    bubble: document.getElementById('bubble'),
    getFraction: () => 0.1,
    formatLabel: (f) => `t=${f.toFixed(2)}`,
    onCommit: (f) => commits.push(f),
    onNudge: () => {}
  });

  bar.dispatchEvent(pointerEvent(dom, 'pointerdown', 50));
  assert.equal(scrubber.isScrubbing(), true);
  assert.equal(bar.classList.contains('scrubbing'), true);
  const bubble = document.getElementById('bubble');
  assert.equal(bubble.hidden, false);
  assert.equal(bubble.textContent, 't=0.50');
  assert.equal(document.getElementById('fill').style.width, '50%');

  bar.dispatchEvent(pointerEvent(dom, 'pointermove', 75));
  assert.equal(document.getElementById('fill').style.width, '75%');
  assert.equal(document.getElementById('handle').style.left, '75%');
  assert.equal(bar.getAttribute('aria-valuenow'), '75');
  assert.deepEqual(commits, []); // nothing committed mid-drag

  bar.dispatchEvent(pointerEvent(dom, 'pointerup', 75));
  assert.deepEqual(commits, [0.75]);
  assert.equal(scrubber.isScrubbing(), false);
  assert.equal(bubble.hidden, true);
  assert.equal(bar.classList.contains('scrubbing'), false);
});

test('createScrubber: pointercancel restores the playback position without committing', () => {
  const { dom, document, bar } = buildScrubberDom();
  const commits = [];
  createScrubber({
    bar,
    fill: document.getElementById('fill'),
    handle: document.getElementById('handle'),
    bubble: document.getElementById('bubble'),
    getFraction: () => 0.25,
    formatLabel: () => 'x',
    onCommit: (f) => commits.push(f),
    onNudge: () => {}
  });

  bar.dispatchEvent(pointerEvent(dom, 'pointerdown', 90));
  assert.equal(document.getElementById('fill').style.width, '90%');
  bar.dispatchEvent(pointerEvent(dom, 'pointercancel', 90));
  assert.deepEqual(commits, []);
  assert.equal(document.getElementById('fill').style.width, '25%');
});

test('createScrubber: keyboard arrows nudge, End commits fraction 1', () => {
  const { dom, document, bar } = buildScrubberDom();
  const nudges = [];
  const commits = [];
  createScrubber({
    bar,
    fill: document.getElementById('fill'),
    handle: document.getElementById('handle'),
    bubble: document.getElementById('bubble'),
    getFraction: () => 0,
    formatLabel: () => 'x',
    onCommit: (f) => commits.push(f),
    onNudge: (s) => nudges.push(s)
  });

  bar.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'ArrowRight' }));
  bar.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'ArrowLeft', shiftKey: true }));
  bar.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'End' }));
  bar.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'a' }));
  assert.deepEqual(nudges, [5, -1]);
  assert.deepEqual(commits, [1]);
});

test('createScrubber: update() paints position but is ignored mid-drag', () => {
  const { dom, document, bar } = buildScrubberDom();
  const scrubber = createScrubber({
    bar,
    fill: document.getElementById('fill'),
    handle: document.getElementById('handle'),
    bubble: document.getElementById('bubble'),
    getFraction: () => 0,
    formatLabel: (f) => `t=${f}`,
    onCommit: () => {},
    onNudge: () => {}
  });

  scrubber.update(0.4, '0:40 of 1:40');
  assert.equal(document.getElementById('fill').style.width, '40%');
  assert.equal(bar.getAttribute('aria-valuetext'), '0:40 of 1:40');

  bar.dispatchEvent(pointerEvent(dom, 'pointerdown', 80));
  scrubber.update(0.5); // playback tick during a drag must not fight the preview
  assert.equal(document.getElementById('fill').style.width, '80%');
});
