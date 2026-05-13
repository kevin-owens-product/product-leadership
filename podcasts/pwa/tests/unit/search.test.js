import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

import { applyLiteralHighlight } from '../../src/search/transcript-search.js';

test('applyLiteralHighlight handles regex characters literally', () => {
  const dom = new JSDOM('<div id="t">a+b?(c)[d] and a+b?(c)[d]</div>');
  const textEl = dom.window.document.getElementById('t');
  global.document = dom.window.document;

  applyLiteralHighlight(textEl, 'a+b?(c)[d]');

  const highlighted = textEl.querySelectorAll('.highlight');
  assert.equal(highlighted.length, 2);
  assert.equal(highlighted[0].textContent, 'a+b?(c)[d]');
  delete global.document;
});
