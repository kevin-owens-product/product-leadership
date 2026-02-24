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
});

test('parseChaptersFromContent falls back to episode duration by line span', () => {
  const markdown = `
# Episode
**Duration:** ~60 minutes

### INTRO
**ALEX:** one
**SAM:** two

### SEGMENT 1
**ALEX:** three
**SAM:** four
**ALEX:** five
**SAM:** six
`;

  const chapters = parseChaptersFromContent(markdown, SPEAKER_LINE_RE);
  assert.equal(chapters.length, 2);
  assert.equal(chapters[0].duration, 20);
  assert.equal(chapters[1].duration, 40);
});
