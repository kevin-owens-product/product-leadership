import test from 'node:test';
import assert from 'node:assert/strict';

import { renderQueueItem } from '../../src/ui/render.js';

test('renderQueueItem uses podcast.title and escapes content', () => {
  const html = renderQueueItem(
    { podcastId: 'p1', episodeNum: 1 },
    { title: '<Episode>' },
    { title: 'My Podcast', name: 'WrongName' },
    false,
    0
  );

  assert.match(html, /My Podcast/);
  assert.doesNotMatch(html, /WrongName/);
  assert.match(html, /&lt;Episode&gt;/);
});
