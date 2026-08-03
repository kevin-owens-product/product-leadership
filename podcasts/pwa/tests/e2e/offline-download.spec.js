import { test, expect } from '@playwright/test';

// The flight test: download an episode while online, then cut the network the
// way an aeroplane does — service worker still installed, caches intact, no
// route to the origin at all — and confirm the app still boots, still knows the
// episode is downloaded, and still gets playable audio for it.

const PODCAST = 'Control Loop';
const EPISODE = 'The Loop Is the Architecture';

async function bootOnline(page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => {});
  // The service worker must be controlling the page or nothing below is a
  // meaningful offline test.
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, { timeout: 20_000 });
  await expect(page.locator('#podcasts-view')).toBeVisible();
}

async function openShow(page) {
  const card = page.locator(`.podcast-card:has-text("${PODCAST}")`).first();
  await expect(card).toBeVisible();
  await card.click();
}

function episodeCard(page) {
  return page.locator(`.episode-card:has-text("${EPISODE}")`).first();
}

async function downloadEpisode(page) {
  const card = episodeCard(page);
  await expect(card).toBeVisible();
  await card.locator('.download-btn, [title*="Download"], [aria-label*="Download"]').first().click();
  // The button flips to the downloaded affordance once the SW confirms.
  await expect
    .poll(async () => page.evaluate(() => JSON.parse(localStorage.getItem('downloadedEpisodes') || '[]').length), {
      timeout: 60_000
    })
    .toBeGreaterThan(0);
}

test('a downloaded episode survives going offline', async ({ page, context }) => {
  await bootOnline(page);
  await openShow(page);
  await downloadEpisode(page);

  const savedBefore = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('downloadedEpisodes') || '[]')
  );
  expect(savedBefore.length).toBeGreaterThan(0);

  // Aeroplane mode, then a cold start — this is the case that matters. A
  // reload is what a user does when they open the app at cruising altitude.
  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });

  // 1. The shell has to come back at all.
  await expect(page.locator('#podcasts-view')).toBeVisible({ timeout: 20_000 });

  // 2. The library has to still be there — podcasts.js is precached, so an
  //    empty list offline means the shell cache is not doing its job.
  await expect(page.locator(`.podcast-card:has-text("${PODCAST}")`).first()).toBeVisible({ timeout: 20_000 });

  // 3. The download record has to survive. reconcile() rewrites this set from
  //    the SW cache on boot, so a wipe here means it ran against a library it
  //    could not see.
  await expect
    .poll(async () => page.evaluate(() => JSON.parse(localStorage.getItem('downloadedEpisodes') || '[]').length), {
      timeout: 15_000
    })
    .toBeGreaterThan(0);

  // 4. The audio itself has to be served from cache, including the manifest —
  //    which the app requests without the ?v= cache-buster it was stored under.
  const fetched = await page.evaluate(async () => {
    const base = '/audio/control-loop/episode-01-the-loop-is-the-architecture/';
    const out = {};
    for (const name of ['manifest.json', 'combined.mp3']) {
      try {
        const res = await fetch(base + name);
        out[name] = { ok: res.ok, status: res.status, bytes: (await res.blob()).size };
      } catch (err) {
        out[name] = { ok: false, error: String(err && err.message || err) };
      }
    }
    return out;
  });
  expect(fetched['manifest.json'].ok, `manifest offline: ${JSON.stringify(fetched['manifest.json'])}`).toBe(true);
  expect(fetched['combined.mp3'].ok, `audio offline: ${JSON.stringify(fetched['combined.mp3'])}`).toBe(true);
  expect(fetched['combined.mp3'].bytes).toBeGreaterThan(1000);
});

test('a downloaded episode still opens and arms playback offline', async ({ page, context }) => {
  await bootOnline(page);
  await openShow(page);
  await downloadEpisode(page);

  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });

  await expect(page.locator('#podcasts-view')).toBeVisible({ timeout: 20_000 });
  await openShow(page);
  await episodeCard(page).click();

  await expect(page.locator('#player-view')).toHaveClass(/active/, { timeout: 20_000 });
  // Dialogue lines come from the precached podcasts.js; an empty transcript
  // offline means the episode content never made it into the shell.
  await expect
    .poll(async () => page.locator('#transcript-content .transcript-line').count(), { timeout: 15_000 })
    .toBeGreaterThan(0);

  // The player element is detached, so assert on what the user can see: a real
  // remaining-time readout means the episode's timeline resolved offline.
  await expect(page.locator('#time-remaining')).not.toHaveText(/^\s*$/, { timeout: 20_000 });
  await expect(page.locator('#time-remaining')).toContainText(/\d/);
});
