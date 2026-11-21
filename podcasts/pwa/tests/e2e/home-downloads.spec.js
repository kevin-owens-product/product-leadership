import { test, expect } from '@playwright/test';

test('home Downloads reflects verified episodes across shows and opens them offline', async ({ page, context }) => {
  test.setTimeout(90000);
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

test('restores a lost saved MP3 from its remaining manifest without counting it as playable', async ({ page, context }) => {
  test.setTimeout(90000);
  await page.goto('/');
  const summary = page.locator('#home-downloads summary');
  await expect(summary).toHaveText('Downloads (0)');
  await page.locator('.podcast-card[data-podcast-id="claude-code-mastery"]').click();
  const episode = page.locator('.episode-card[data-episode-id="1"]');
  await episode.locator('.ep-download-btn').click();
  await expect(episode.locator('.ep-download-btn')).toHaveClass(/downloaded/, { timeout: 30000 });

  // The previous player could remove the MP3 during playback recovery and
  // overwrite the verified index. Its saved manifest still identifies the episode.
  await page.evaluate(async () => {
    const cache = await caches.open('podlearn-offline-audio-v1');
    const audio = (await cache.keys()).find(key => new URL(key.url).pathname.endsWith('/combined.mp3'));
    if (!audio || !await cache.delete(audio)) throw new Error('Missing saved MP3 fixture');
    localStorage.setItem('downloadedEpisodes', '[]');
    localStorage.removeItem('downloadSelections');
  });
  await page.close();
  await context.setOffline(true);
  const restoredPage = await context.newPage();
  await restoredPage.goto('/', { waitUntil: 'domcontentloaded' });
  const downloads = restoredPage.locator('#home-downloads summary');
  await expect(downloads).toHaveText('Downloads (0 ready, 1 to restore)');
  await downloads.click();
  const list = restoredPage.locator('#downloads-list');
  const restore = list.getByRole('button', { name: /Restore Getting Started with Claude Code/ });
  await restore.click();
  await expect(restoredPage.getByText('Connect to the internet to restore this download.')).toBeVisible();
  await context.setOffline(false);
  await restore.click();
  await expect(downloads).toHaveText('Downloads (1)', { timeout: 30000 });
  await expect(list.getByRole('button', { name: /Play Getting Started with Claude Code/ })).toBeVisible();
  await context.setOffline(true);
  await list.getByRole('button', { name: /Play Getting Started with Claude Code/ }).click();
  await expect(restoredPage.locator('#play-btn')).toHaveAttribute('aria-label', 'Pause');
});
