import { test, expect } from '@playwright/test';

// Toast-on-error coverage (Phase 2): a 404'd audio file must surface a retry
// toast instead of failing silently — in both playback modes.
//
// The service worker performs its own network fetches, which page.route()
// cannot intercept — block it so the 404 routes actually reach the app.
test.use({ serviceWorkers: 'block' });

async function openEpisode(page, podcastTitle = 'The Forge Podcast', episodeTitle = 'AI-Native Product Management') {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => {});
  await expect(page.locator('#podcasts-view')).toBeVisible();

  // Card clicks can be swallowed if a re-render or view transition is in
  // flight (more likely under parallel-worker load), so retry click -> view
  // swap as a unit until the target view activates.
  const podcastCard = page.locator(`.podcast-card:has-text("${podcastTitle}")`).first();
  await expect(podcastCard).toBeVisible();
  await expect(async () => {
    await podcastCard.click({ timeout: 2000 });
    await expect(page.locator('#list-view')).toHaveClass(/active/, { timeout: 2000 });
  }).toPass({ timeout: 20000 });

  const episodeCard = page.locator(`.episode-card:has-text("${episodeTitle}")`).first();
  await expect(episodeCard).toBeVisible();
  await expect(async () => {
    await episodeCard.click({ timeout: 2000 });
    await expect(page.locator('#player-view')).toHaveClass(/active/, { timeout: 2000 });
  }).toPass({ timeout: 20000 });
}

test('404 per-line audio surfaces a coalesced skip-ahead retry toast', async ({ page }) => {
  // Every chunk 404s — playback must keep advancing and show ONE toast.
  await page.route('**/audio/the-forge-podcast/episode-04-ai-native-product-management/*.mp3*', route =>
    route.fulfill({ status: 404, contentType: 'text/plain', body: 'not found' })
  );

  await openEpisode(page);
  await page.locator('#play-btn').click();

  const toast = page.locator('#toast-region .toast', { hasText: 'Audio failed for a line' });
  await expect(toast).toBeVisible();
  await expect(toast.locator('.toast-action')).toHaveText('Retry');

  // Identical failures coalesce: a run of 404'ing lines shows one toast, not N.
  await page.waitForTimeout(800);
  await expect(page.locator('#toast-region .toast', { hasText: 'Audio failed for a line' })).toHaveCount(1);
});

test('404 combined audio in continuous mode surfaces a retry toast', async ({ page }) => {
  // Deadwater plays via combined.mp3 (continuous mode); breaking that file
  // must produce a load-failure toast with a Retry action.
  await page.route('**/audio/deadwater/deadwater_s01e01/combined.mp3*', route =>
    route.fulfill({ status: 404, contentType: 'text/plain', body: 'not found' })
  );

  await openEpisode(page, 'Deadwater', 'The Find');
  await page.locator('#play-btn').click();

  const toast = page.locator('#toast-region .toast', {
    hasText: /Audio failed to load|Playback failed to start/
  });
  await expect(toast.first()).toBeVisible({ timeout: 15000 });
  await expect(toast.first().locator('.toast-action')).toHaveText('Retry');
});
