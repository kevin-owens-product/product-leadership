import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

import { initBackNav, backTarget, performBack } from '../../src/app/back-nav.js';

// A history double that models the one property that matters: popstate fires
// when an entry is popped, and the entry is already gone by the time handlers
// run. jsdom's own history doesn't dispatch popstate for back().
function createWin() {
  const listeners = [];
  const stack = [{ state: null }];
  const win = {
    history: {
      get length() { return stack.length; },
      pushState(state) { stack.push({ state }); },
      back() {
        if (stack.length > 1) stack.pop();
        listeners.forEach((fn) => fn());
      }
    },
    addEventListener(ev, fn) { if (ev === 'popstate') listeners.push(fn); },
    removeEventListener(ev, fn) {
      if (ev !== 'popstate') return;
      const i = listeners.indexOf(fn);
      if (i >= 0) listeners.splice(i, 1);
    },
    // Test-only: simulate the hardware back gesture.
    pressBack() { win.history.back(); },
    depth() { return stack.length; }
  };
  return win;
}

// Depth 0 = root screen. Each level is one thing a back press should undo.
function createApp(win) {
  let depth = 0;
  const nav = initBackNav({
    canGoBack: () => depth > 0,
    goBack: () => { depth -= 1; },
    win
  });
  return {
    nav,
    push() { depth += 1; nav.sync(); },
    popInApp() { depth -= 1; nav.sync(); },
    get depth() { return depth; }
  };
}

test('at the root screen a back press is left to the browser', () => {
  const win = createWin();
  createApp(win);
  assert.equal(win.depth(), 1, 'no sentinel should be armed at the root');
});

test('back steps one level in instead of leaving the app', () => {
  const win = createWin();
  const app = createApp(win);
  app.push(); // root -> list
  assert.equal(win.depth(), 2, 'a sentinel should be armed');

  win.pressBack();
  assert.equal(app.depth, 0, 'back should step in-app, not exit');
  assert.equal(win.depth(), 1, 'sentinel consumed and not re-armed at root');
});

test('the sentinel stack never grows past two no matter how deep the user is', () => {
  const win = createWin();
  const app = createApp(win);
  app.push();
  app.push();
  app.push();
  assert.equal(app.depth, 3);
  assert.equal(win.depth(), 2, 'exactly one sentinel regardless of app depth');
});

test('each back press unwinds one level, and the last one exits', () => {
  const win = createWin();
  const app = createApp(win);
  app.push(); // list
  app.push(); // player
  app.push(); // overlay

  win.pressBack();
  assert.equal(app.depth, 2);
  win.pressBack();
  assert.equal(app.depth, 1);
  win.pressBack();
  assert.equal(app.depth, 0);
  assert.equal(win.depth(), 1, 'back at the root leaves nothing of ours on the stack');

  // The press after reaching the root must reach the browser so the app closes.
  win.pressBack();
  assert.equal(app.depth, 0, 'no further in-app navigation to perform');
});

// Navigating home with the on-screen back arrow used to leave our sentinel
// behind, so the first hardware back press did nothing at all.
test('in-app navigation back to the root disarms the sentinel', () => {
  const win = createWin();
  const app = createApp(win);
  app.push();
  assert.equal(win.depth(), 2);

  app.popInApp(); // user tapped the on-screen back arrow
  assert.equal(app.depth, 0);
  assert.equal(win.depth(), 1, 'stale sentinel should have been dropped');
});

test('disarming does not fire in-app navigation of its own', () => {
  const win = createWin();
  const app = createApp(win);
  app.push();
  app.push();
  app.popInApp();
  app.popInApp(); // back to root via the UI; triggers a self-pop
  assert.equal(app.depth, 0, 'self-pop must not drive depth negative');
  assert.equal(win.depth(), 1);
});

test('missing History API degrades to a no-op instead of throwing', () => {
  const nav = initBackNav({ canGoBack: () => true, goBack: () => {}, win: {} });
  assert.doesNotThrow(() => nav.sync());
  assert.doesNotThrow(() => nav.destroy());
});

// ---- DOM precedence ----

function domFrom(html) {
  return new JSDOM(`<body>${html}</body>`).window.document;
}

test('backTarget unwinds overlays before screens', () => {
  const doc = domFrom(`
    <div id="list-view" class="view"></div>
    <div id="player-view" class="view active"></div>
    <div id="sheet" class="modal-overlay show"></div>
  `);
  assert.equal(backTarget(doc), 'overlay');
});

test('backTarget reports the active screen once no overlay is up', () => {
  const player = domFrom('<div id="player-view" class="view active"></div>');
  assert.equal(backTarget(player), 'player');

  const list = domFrom('<div id="list-view" class="view active"></div>');
  assert.equal(backTarget(list), 'list');

  const home = domFrom('<div id="list-view" class="view"></div>');
  assert.equal(backTarget(home), null, 'the root screen has nothing to unwind');
});

test('performBack closes an overlay through its own dismiss control', () => {
  const doc = domFrom('<div id="m" class="modal-overlay show"><button id="close-m"></button></div>');
  let clicked = false;
  doc.getElementById('close-m').addEventListener('click', () => { clicked = true; });
  performBack(doc);
  assert.equal(clicked, true, 'the close handler must run, not just the class come off');
});

test('performBack still closes an overlay that has no dismiss control', () => {
  const doc = domFrom('<div id="m" class="modal-overlay show"></div>');
  performBack(doc);
  assert.equal(doc.getElementById('m').classList.contains('show'), false);
});

test('performBack closes the topmost overlay when several are stacked', () => {
  const doc = domFrom(`
    <div id="a" class="modal-overlay show"><button id="close-a"></button></div>
    <div id="b" class="modal-overlay show"><button id="close-b"></button></div>
  `);
  const hit = [];
  doc.getElementById('close-a').addEventListener('click', () => hit.push('a'));
  doc.getElementById('close-b').addEventListener('click', () => hit.push('b'));
  performBack(doc);
  assert.deepEqual(hit, ['b']);
});

test('performBack routes screens through the existing back controls', () => {
  const doc = domFrom(`
    <div id="player-view" class="view active"></div>
    <button id="back-to-list"></button>
  `);
  let clicked = false;
  doc.getElementById('back-to-list').addEventListener('click', () => { clicked = true; });
  performBack(doc);
  assert.equal(clicked, true);
});

test('performBack at the root does nothing', () => {
  const doc = domFrom('<div id="list-view" class="view"></div>');
  assert.doesNotThrow(() => performBack(doc));
});
