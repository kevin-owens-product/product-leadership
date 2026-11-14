import { test, expect } from '@playwright/test';

// Home-screen and show-page conveniences: the Continue listening row, "new"
// markers, the season download button and the podcast-app feed.

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('qol-seeded')) return;
    sessionStorage.setItem('qol-seeded', '1');
    localStorage.setItem('tlu_podcast_state', JSON.stringify({
      schemaVersion: 1,
      episodeProgress: {
        'agentic-coding-frontier-1': { line: 10, percent: 30, timestamp: Date.now() }
      },
      completedEpisodes: [],
      bookmarks: {},
      speechRate: 1,
      autoPlayNext: true
    }));
    // Tracking already started on this device and nothing is known yet, so
    // every episode in the catalog counts as having just arrived.
    localStorage.setItem('newEpisodes', JSON.stringify({ initialized: true, known: {}, opened: {} }));
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.podcast-card').first()).toBeVisible();
});

test('continue listening resumes a half-finished episode from the home screen', async ({ page }) => {
  const shelf = page.locator('#continue-listening');
  await expect(shelf).toBeVisible();
  const card = shelf.locator('.continue-card[data-podcast-id="agentic-coding-frontier"][data-episode-id="1"]');
  await expect(card).toBeVisible();
  await expect(card).toContainText('left');
  await card.click();
  await expect(page.locator('#player-view')).toHaveClass(/active/);
  await expect(page.locator('#transcript-content .transcript-line').first()).toBeVisible();
  await expect(page.locator('#transcript-content .transcript-line.current').first())
    .toBeVisible();
});

test('new episodes are flagged on the show tile and the episode list, and clear once opened', async ({ page }) => {
  const tile = page.locator('.podcast-card[data-podcast-id="agentic-coding-frontier"]');
  const badge = tile.locator('.podcast-new-badge');
  await expect(badge).toHaveText(/\d+ new/);
  const before = Number((await badge.textContent()).match(/\d+/)[0]);

  await tile.click();
  const ep2 = page.locator('.episode-card[data-episode-id="2"]');
  await expect(ep2.locator('.ep-status.new')).toHaveText('New');
  // The in-progress episode shows its percent, not "New".
  await expect(page.locator('.episode-card[data-episode-id="1"] .ep-status.new')).toHaveCount(0);

  await ep2.click();
  await expect(page.locator('#player-view')).toHaveClass(/active/);
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.podcast-card[data-podcast-id="agentic-coding-frontier"] .podcast-new-badge'))
    .toHaveText(`${before - 1} new`);
});

test('season download button states its size, and the feed is valid RSS', async ({ page, request }) => {
  await page.locator('.podcast-card[data-podcast-id="agentic-coding-frontier"]').click();
  await expect(page.locator('#bulk-download-label')).toHaveText(/^Download season \d+ · \d+ episodes? · [\d.]+ (MB|GB)$/);
  await expect(page.locator('#feed-btn')).toBeVisible();

  const res = await request.get('/feeds/agentic-coding-frontier.xml');
  expect(res.ok()).toBeTruthy();
  const xml = await res.text();
  expect(xml).toContain('<itunes:block>yes</itunes:block>');
  const enclosure = xml.match(/<enclosure url="([^"]+)"/)[1];
  const audioPath = new URL(enclosure).pathname;
  const audio = await request.fetch(audioPath, { method: 'HEAD' });
  expect(audio.ok()).toBeTruthy();
});
