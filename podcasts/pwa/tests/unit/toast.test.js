import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

import {
  createToastManager,
  TOAST_DURATION_MS,
  TOAST_ACTION_DURATION_MS
} from '../../src/ui/toast.js';

function makeHarness({ maxVisible } = {}) {
  const dom = new JSDOM('<div id="toast-region"></div>');
  const container = dom.window.document.getElementById('toast-region');
  // Manual timer harness so tests control auto-dismiss deterministically.
  const timers = new Map();
  let nextId = 1;
  const setTimer = (fn, ms) => {
    const id = nextId++;
    timers.set(id, { fn, ms });
    return id;
  };
  const clearTimer = (id) => timers.delete(id);
  const fire = (id) => {
    const t = timers.get(id);
    if (!t) return;
    timers.delete(id);
    t.fn();
  };
  const fireAll = () => [...timers.keys()].forEach(fire);
  const manager = createToastManager({
    container,
    ...(maxVisible ? { maxVisible } : {}),
    setTimer,
    clearTimer
  });
  return { dom, container, manager, timers, fire, fireAll };
}

test('shows a toast with message, role=status, and close button', () => {
  const { container, manager } = makeHarness();
  manager.show('Download failed');
  const toast = container.querySelector('.toast');
  assert.ok(toast);
  assert.equal(toast.getAttribute('role'), 'status');
  assert.equal(toast.querySelector('.toast-message').textContent, 'Download failed');
  assert.ok(toast.querySelector('.toast-close'));
  assert.equal(toast.querySelector('.toast-action'), null);
});

test('action button runs the callback and dismisses the toast', () => {
  const { container, manager } = makeHarness();
  let retried = 0;
  manager.show('Audio failed', { actionLabel: 'Retry', onAction: () => { retried++; } });
  const action = container.querySelector('.toast-action');
  assert.equal(action.textContent, 'Retry');
  action.click();
  assert.equal(retried, 1);
  assert.equal(container.querySelectorAll('.toast').length, 0);
});

test('close button dismisses without running the action', () => {
  const { container, manager } = makeHarness();
  let retried = 0;
  manager.show('Audio failed', { actionLabel: 'Retry', onAction: () => { retried++; } });
  container.querySelector('.toast-close').click();
  assert.equal(retried, 0);
  assert.equal(container.querySelectorAll('.toast').length, 0);
});

test('auto-dismisses after the default duration (longer with an action)', () => {
  const { container, manager, timers, fireAll } = makeHarness();
  manager.show('plain');
  manager.show('actionable', { actionLabel: 'Do it', onAction: () => {} });
  const durations = [...timers.values()].map((t) => t.ms);
  assert.deepEqual(durations, [TOAST_DURATION_MS, TOAST_ACTION_DURATION_MS]);
  fireAll();
  assert.equal(container.querySelectorAll('.toast').length, 0);
});

test('duration 0 makes a sticky toast with no timer', () => {
  const { manager, timers } = makeHarness();
  manager.show('Update available', { actionLabel: 'Update', onAction: () => {}, duration: 0 });
  assert.equal(timers.size, 0);
});

test('queues beyond maxVisible and promotes on dismiss', () => {
  const { container, manager } = makeHarness({ maxVisible: 2 });
  const first = manager.show('one');
  manager.show('two');
  manager.show('three');
  assert.equal(manager.visibleCount(), 2);
  assert.equal(manager.pendingCount(), 1);
  assert.equal(container.querySelectorAll('.toast').length, 2);

  first.dismiss();
  assert.equal(manager.visibleCount(), 2);
  assert.equal(manager.pendingCount(), 0);
  const messages = [...container.querySelectorAll('.toast-message')].map((el) => el.textContent);
  assert.deepEqual(messages, ['two', 'three']);
});

test('duplicate visible message refreshes instead of stacking', () => {
  const { container, manager, timers } = makeHarness();
  manager.show('same error');
  const firstTimerCount = timers.size;
  manager.show('same error');
  assert.equal(container.querySelectorAll('.toast').length, 1);
  assert.equal(timers.size, firstTimerCount); // old timer cleared, new one set
});

test('dismissing a queued toast removes it from the queue', () => {
  const { manager } = makeHarness({ maxVisible: 1 });
  manager.show('one');
  const queued = manager.show('two');
  assert.equal(manager.pendingCount(), 1);
  queued.dismiss();
  assert.equal(manager.pendingCount(), 0);
});

test('dismissAll clears visible and pending toasts', () => {
  const { container, manager } = makeHarness({ maxVisible: 1 });
  manager.show('one');
  manager.show('two');
  manager.dismissAll();
  assert.equal(container.querySelectorAll('.toast').length, 0);
  assert.equal(manager.visibleCount(), 0);
  assert.equal(manager.pendingCount(), 0);
});

test('empty message or missing container is a no-op', () => {
  const { manager } = makeHarness();
  manager.show('   ');
  assert.equal(manager.visibleCount(), 0);
  const detached = createToastManager({});
  const handle = detached.show('anything');
  assert.equal(typeof handle.dismiss, 'function');
  handle.dismiss(); // must not throw
});
