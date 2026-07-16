import { test, expect } from '@playwright/test';

// First-visit SW activation (skipWaiting + clients.claim) triggers a
// controllerchange reload that can land mid-test and bounce the app back to
// home. These tests don't exercise the service worker, so block it.
test.use({ serviceWorkers: 'block' });

// Scrubber drag-to-seek coverage (Phase 1). Two playback modes to cover:
// continuous (combined.mp3 + per-line durations) shows clock-time labels;
// the chunked fallback shows line-based labels.
//
// Chunked mode is forced with forceChunkedFallback() rather than by opening a
// show that happens to lack durations: every show in the catalog now ships
// them, and pinning the test to whichever show was un-generated made it fail
// the moment that show's audio was regenerated.
async function forceChunkedFallback(page) {
    await page.route('**/audio/**/manifest.json*', async (route) => {
        const response = await route.fetch();
        const manifest = await response.json();
        const items = Array.isArray(manifest) ? manifest : manifest.lines || manifest.items || [];
        // buildLineOffsets() needs per-line durations; without them main.js
        // takes the chunked path. Drop them and keep everything else intact.
        for (const item of items) {
            delete item.duration;
            delete item.startTime;
        }
        await route.fulfill({ response, json: manifest });
    });
}

async function openEpisode(page, podcastTitle = 'Claude Code Mastery', episodeTitle = 'Getting Started with Claude Code') {
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
//
// Stability needs a *sustained* rest, not one matching pair: the auto-scroll
// starts a beat after the view activates, so a single 150ms match can land in
// the stillness before it and hand back coordinates that go stale mid-drag.
const STABLE_POLLS = 6; // ≈600ms of quiet, comfortably past the auto-scroll
async function settledBox(page, locator) {
  await locator.scrollIntoViewIfNeeded();
  let prev = await locator.boundingBox();
  let stable = 0;
  for (let i = 0; i < 40; i += 1) {
    await page.waitForTimeout(100);
    const cur = await locator.boundingBox();
    if (prev && cur && Math.abs(cur.x - prev.x) < 1 && Math.abs(cur.y - prev.y) < 1) {
      stable += 1;
      if (stable >= STABLE_POLLS) return cur;
    } else {
      stable = 0;
    }
    prev = cur;
  }
  return prev;
}

test('scrubber drag shows a preview bubble and only commits the seek on release', async ({ page }) => {
  await forceChunkedFallback(page);
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
  await forceChunkedFallback(page);
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
