import test from 'node:test';
import assert from 'node:assert/strict';

import { createRepeatSkipper } from '../../src/ui/long-press.js';

// Minimal manual-clock timer harness so the repeat logic runs headlessly.
function fakeTimers() {
  let now = 0;
  let nextId = 1;
  const timeouts = new Map();
  const intervals = new Map();
  return {
    setTimeout(fn, delay) {
      const id = nextId++;
      timeouts.set(id, { fn, at: now + delay });
      return id;
    },
    clearTimeout(id) { timeouts.delete(id); },
    setInterval(fn, every) {
      const id = nextId++;
      intervals.set(id, { fn, every, next: now + every });
      return id;
    },
    clearInterval(id) { intervals.delete(id); },
    advance(ms) {
      const target = now + ms;
      while (true) {
        let earliest = null;
        for (const [id, t] of timeouts) {
          if (t.at <= target && (!earliest || t.at < earliest.at)) earliest = { id, at: t.at, fn: t.fn, kind: 'timeout' };
        }
        for (const [id, i] of intervals) {
          if (i.next <= target && (!earliest || i.next < earliest.at)) earliest = { id, at: i.next, fn: i.fn, kind: 'interval' };
        }
        if (!earliest) break;
        now = earliest.at;
        if (earliest.kind === 'timeout') timeouts.delete(earliest.id);
        else {
          const i = intervals.get(earliest.id);
          if (i) i.next += i.every;
        }
        earliest.fn();
      }
      now = target;
    }
  };
}

test('short press never fires the repeat action', () => {
  const timers = fakeTimers();
  let fired = 0;
  const skipper = createRepeatSkipper({
    action: () => { fired += 1; },
    initialDelayMs: 500,
    repeatIntervalMs: 300,
    timers
  });

  skipper.press();
  timers.advance(200);
  const wasRepeating = skipper.release();
  assert.equal(fired, 0);
  assert.equal(wasRepeating, false);
  timers.advance(2000); // nothing pending after release
  assert.equal(fired, 0);
});

test('long press fires once after the delay then repeats on the interval', () => {
  const timers = fakeTimers();
  let fired = 0;
  const skipper = createRepeatSkipper({
    action: () => { fired += 1; },
    initialDelayMs: 500,
    repeatIntervalMs: 300,
    timers
  });

  skipper.press();
  timers.advance(499);
  assert.equal(fired, 0);
  timers.advance(1); // 500ms: first repeat fires
  assert.equal(fired, 1);
  assert.equal(skipper.isRepeating(), true);
  timers.advance(900); // 3 more interval ticks
  assert.equal(fired, 4);

  const wasRepeating = skipper.release();
  assert.equal(wasRepeating, true);
  timers.advance(2000);
  assert.equal(fired, 4); // repeats stop on release
});

test('release resets state so the next press starts clean', () => {
  const timers = fakeTimers();
  let fired = 0;
  const skipper = createRepeatSkipper({
    action: () => { fired += 1; },
    initialDelayMs: 500,
    repeatIntervalMs: 300,
    timers
  });

  skipper.press();
  timers.advance(600);
  assert.equal(skipper.release(), true);

  skipper.press();
  timers.advance(100);
  assert.equal(skipper.release(), false); // fresh press, no repeat yet
  assert.equal(fired, 1);
});

test('pressing again while pressed restarts the delay', () => {
  const timers = fakeTimers();
  let fired = 0;
  const skipper = createRepeatSkipper({
    action: () => { fired += 1; },
    initialDelayMs: 500,
    repeatIntervalMs: 300,
    timers
  });

  skipper.press();
  timers.advance(400);
  skipper.press(); // e.g. duplicate pointerdown
  timers.advance(400);
  assert.equal(fired, 0); // delay restarted, not yet elapsed
  timers.advance(100);
  assert.equal(fired, 1);
  skipper.release();
});
