import test from 'node:test';
import assert from 'node:assert/strict';

import { parseChaptersFromContent } from '../../src/playback/chapters.js';

const SPEAKER_LINE_RE = /^\*\*([A-Z][A-Z0-9 '&()./-]*):\*\*\s*(.*)$/;

test('parseChaptersFromContent prefers explicit chapter minute hints', () => {
  const markdown = `
# Episode
**Duration:** ~60 minutes

### INTRO (5 minutes)
**ALEX:** Welcome.
**SAM:** Hi.

### SEGMENT 1 (8 minutes)
**ALEX:** Deep dive.
**SAM:** Details.
`;

  const chapters = parseChaptersFromContent(markdown, SPEAKER_LINE_RE);
  assert.equal(chapters.length, 2);
  assert.equal(chapters[0].duration, 5);
  assert.equal(chapters[1].duration, 8);
  assert.equal(chapters[0].startMinute, 0);
  assert.equal(chapters[1].startMinute, 5);
});

test('parseChaptersFromContent falls back to episode duration by chapter content density', () => {
  const markdown = `
# Episode
**Duration:** ~60 minutes

### INTRO
**ALEX:** one two three four five

### SEGMENT 1
**SAM:** one two three four five six seven eight nine ten one two three four five
`;

  const chapters = parseChaptersFromContent(markdown, SPEAKER_LINE_RE);
  assert.equal(chapters.length, 2);
  assert.equal(chapters[0].duration, 15);
  assert.equal(chapters[1].duration, 45);
  assert.equal(chapters[0].startMinute, 0);
  assert.equal(chapters[1].startMinute, 15);
});

test('parseChaptersFromContent distributes remaining episode minutes after hints', () => {
  const markdown = `
# Episode
**Duration:** ~55 minutes

### INTRO (5 minutes)
**ALEX:** short section

### SEGMENT 1
**SAM:** this chapter carries most of the remaining content and should inherit the remaining budget
`;

  const chapters = parseChaptersFromContent(markdown, SPEAKER_LINE_RE);
  assert.equal(chapters.length, 2);
  assert.equal(chapters[0].duration, 5);
  assert.equal(chapters[1].duration, 50);
  assert.equal(chapters[1].startMinute, 5);
  assert.equal(chapters[1].endMinute, 55);
});
