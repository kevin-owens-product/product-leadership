import test from 'node:test';
import assert from 'node:assert/strict';

import { buildBookmarksExport, buildProgressExport } from '../../src/share-export/export.js';

test('buildBookmarksExport reads canonical bookmark structure', () => {
  const payload = buildBookmarksExport({
    state: {
      bookmarks: {
        'tech-1': [{ lineIndex: 2, note: 'important', timestamp: 1 }]
      }
    },
    currentPodcast: { id: 'tech', title: 'Tech Show' },
    currentEpisode: { id: 1, title: 'Episode 1' },
    dialogueLines: [{ text: 'zero' }, { text: 'one' }, { text: 'two' }]
  });

  assert.equal(payload.podcast, 'Tech Show');
  assert.equal(payload.bookmarks.length, 1);
  assert.equal(payload.bookmarks[0].line, 2);
  assert.equal(payload.bookmarks[0].context, 'two');
});

test('buildProgressExport emits canonical fields', () => {
  const payload = buildProgressExport({
    schemaVersion: 2,
    episodeProgress: { a: { percent: 50 } },
    completedEpisodes: ['a'],
    currentPodcastId: 'p',
    currentEpisodeId: 3,
    currentLineIndex: 9
  });

  assert.equal(payload.schemaVersion, 2);
  assert.equal(payload.currentPodcastId, 'p');
  assert.equal(payload.currentEpisodeId, 3);
  assert.equal(payload.currentLineIndex, 9);
});
