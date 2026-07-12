import test from 'node:test';
import assert from 'node:assert/strict';

import { formatClock, shadeHex } from '../../src/ui/format.js';

test('formatClock renders m:ss below an hour and h:mm:ss above', () => {
    assert.equal(formatClock(0), '0:00');
    assert.equal(formatClock(65), '1:05');
    assert.equal(formatClock(3599.6), '1:00:00'); // rounds up across the hour
    assert.equal(formatClock(3661), '1:01:01');
});

test('formatClock clamps invalid input to zero', () => {
    assert.equal(formatClock(-5), '0:00');
    assert.equal(formatClock(NaN), '0:00');
    assert.equal(formatClock(Infinity), '0:00');
});

test('shadeHex darkens and lightens colors', () => {
    assert.equal(shadeHex('#ffffff', -1), '#000000');
    assert.equal(shadeHex('#000000', 1), '#ffffff');
    assert.equal(shadeHex('#808080', 0), '#808080');
    // Short form expands.
    assert.equal(shadeHex('#fff', -1), '#000000');
});

test('shadeHex returns unparseable input unchanged', () => {
    assert.equal(shadeHex('tomato', 0.5), 'tomato');
    assert.equal(shadeHex('#12', 0.5), '#12');
});
