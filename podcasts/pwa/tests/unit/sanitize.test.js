import test from 'node:test';
import assert from 'node:assert/strict';

import { escapeHtml, escapeRegExp, safeColor } from '../../src/security/sanitize.js';

test('escapeHtml escapes dangerous markup characters', () => {
  assert.equal(escapeHtml('<script>alert("x")</script>'), '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');
});

test('escapeRegExp escapes regex metacharacters', () => {
  assert.equal(escapeRegExp('a+b?(c)[d]'), 'a\\+b\\?\\(c\\)\\[d\\]');
});

test('safeColor accepts valid colors and rejects invalid values', () => {
  assert.equal(safeColor('#1a2b3c'), '#1a2b3c');
  assert.equal(safeColor('rgb(1, 2, 3)'), 'rgb(1, 2, 3)');
  assert.equal(safeColor('javascript:alert(1)'), '#6366f1');
});
