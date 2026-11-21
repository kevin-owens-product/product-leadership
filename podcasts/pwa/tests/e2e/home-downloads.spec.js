import { test, expect } from '@playwright/test';

test('home Downloads reflects verified episodes across shows and opens them offline', async ({ page, context }) => {
  test.setTimeout(90000);
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('downloads-seeded')) {
      sessionStorage.setItem('downloads-seeded', '1');
      // Stale saved flags must not be reported as playable downloads.
      localStorage.setItem('downloadedEpisodes', JSON.stringify(['claude-code-mastery-1']));
    }
  });
  await page.goto('/');
  const summary = page.locator('#home-downloads summary');
  await expect(summary).toHaveText('Downloads (0)');
  await summary.press('Enter');
  await expect(page.locator('#downloads-status')).toContainText('No episodes downloaded');

  const shows = ['claude-code-mastery', 'the-influence-brief'];
  for (const [i, show] of shows.entries()) {
    await page.locator(`.podcast-card[data-podcast-id="${show}"]`).click();
    const episode = page.locator('.episode-card[data-episode-id="1"]');
    await episode.locator('.ep-download-btn').click();
    await expect(episode.locator('.ep-download-btn')).toHaveClass(/downloaded/, { timeout: 30000 });
    await expect(page.locator('#show-download-count')).toHaveText('1 downloaded');
    await page.locator('#back-to-podcasts').click();
    await expect(summary).toHaveText(`Downloads (${i + 1})`);
  }

  // A fresh client tests a cold start. Reusing the old page can race the
  // pending history.back() from the transition back to the home view.
  await page.close();
  await context.setOffline(true);
  const offlinePage = await context.newPage();
  await offlinePage.goto('/', { waitUntil: 'domcontentloaded' });
  const offlineSummary = offlinePage.locator('#home-downloads summary');
  await expect(offlineSummary).toHaveText('Downloads (2)');
  await offlineSummary.click();
  const list = offlinePage.locator('#downloads-list');
  await expect(list.getByRole('button', { name: /Play Getting Started with Claude Code/ })).toBeVisible();
  await list.getByRole('button', { name: /Remove download of Getting Started with Claude Code/ }).click();
  await expect(offlineSummary).toHaveText('Downloads (1)');
  await expect(list.locator('li')).toHaveCount(1);
  await list.getByRole('button', { name: /Play Being Right Is Not a Strategy/ }).click();
  await expect(offlinePage.locator('#player-episode-title')).toHaveText('Being Right Is Not a Strategy');
  await expect(offlinePage.locator('#play-btn')).toHaveAttribute('aria-label', 'Pause');
});
