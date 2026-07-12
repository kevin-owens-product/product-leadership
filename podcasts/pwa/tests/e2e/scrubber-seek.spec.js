import { test, expect } from '@playwright/test';

// First-visit SW activation (skipWaiting + clients.claim) triggers a
// controllerchange reload that can land mid-test and bounce the app back to
// home. These tests don't exercise the service worker, so block it.
test.use({ serviceWorkers: 'block' });

// Scrubber drag-to-seek coverage (Phase 1). The Forge episode plays in the
// chunked fallback mode (no combined.mp3), so scrub labels are line-based;
// Deadwater ships combined.mp3 + durations and exercises continuous mode.

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

// Opening an episode auto-scrolls the page shortly afterwards, which would
// shift the bar between boundingBox() and the synthetic mouse events. Wait
// until the bar's on-screen position is stable before dragging.
async function settledBox(page, locator) {
  await locator.scrollIntoViewIfNeeded();
  let prev = await locator.boundingBox();
  for (let i = 0; i < 20; i += 1) {
    await page.waitForTimeout(150);
    const cur = await locator.boundingBox();
    if (prev && cur && Math.abs(cur.x - prev.x) < 1 && Math.abs(cur.y - prev.y) < 1) return cur;
    prev = cur;
  }
  return prev;
}

test('scrubber drag shows a preview bubble and only commits the seek on release', async ({ page }) => {
  await openEpisode(page);

  const bar = page.locator('#progress-bar');
  const bubble = page.locator('#scrub-bubble');
  const pos = page.locator('#current-pos');
  const initialPos = await pos.textContent();

  const box = await settledBox(page, bar);
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height / 2);
  await page.mouse.down();

  // Mid-drag: scrubbing state + a line-based preview bubble, no commit yet.
  await expect(bar).toHaveClass(/scrubbing/);
  await expect(bubble).toBeVisible();
  await expect(bubble).toHaveText(/^Line \d+ of \d+$/);

  await page.mouse.move(box.x + box.width * 0.75, box.y + box.height / 2);
  const preview = Number(await bar.getAttribute('aria-valuenow'));
  expect(preview).toBeGreaterThanOrEqual(65);
  expect(preview).toBeLessThanOrEqual(85);
  await expect(pos).toHaveText(initialPos); // still uncommitted

  // Release commits the seek: bubble hides, position jumps to ~75%.
  await page.mouse.up();
  await expect(bar).not.toHaveClass(/scrubbing/);
  await expect(bubble).toBeHidden();
  await expect(pos).not.toHaveText(initialPos);
  await expect.poll(async () => Number(await bar.getAttribute('aria-valuenow')))
    .toBeGreaterThanOrEqual(60);
});

test('scrubber keyboard arrows do fine seeks and Home returns to the start', async ({ page }) => {
  await openEpisode(page);

  const bar = page.locator('#progress-bar');
  await bar.focus();

  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#current-pos')).toHaveText('Line 2');

  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#current-pos')).toHaveText('Line 3');

  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('#current-pos')).toHaveText('Line 2');

  await page.keyboard.press('Home');
  await expect(page.locator('#current-pos')).toHaveText('Line 1');
});

test('continuous mode scrubber previews clock time and seeks the combined audio', async ({ page }) => {
  await openEpisode(page, 'Deadwater', 'The Find');

  // Continuous mode ready: the total position renders as a clock duration.
  await expect(page.locator('#total-pos')).toHaveText(/^\d+:\d{2}/, { timeout: 15000 });

  // Start playback so the audio element has metadata before we seek.
  await page.locator('#play-btn').click();
  await expect(page.locator('#current-pos')).not.toHaveText('0:00', { timeout: 15000 });

  const bar = page.locator('#progress-bar');
  const box = await settledBox(page, bar);
  await page.mouse.move(box.x + box.width * 0.75, box.y + box.height / 2);
  await page.mouse.down();
  await expect(page.locator('#scrub-bubble')).toHaveText(/^\d+:\d{2}/);
  await page.mouse.up();

  // Committed seek lands around 75% of the episode.
  await expect.poll(async () => Number(await bar.getAttribute('aria-valuenow')))
    .toBeGreaterThanOrEqual(60);
});
