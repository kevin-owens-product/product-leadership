import { test, expect } from '@playwright/test';

// First-visit SW activation (skipWaiting + clients.claim) triggers a
// controllerchange reload that can land mid-test and bounce the app back to
// home. These tests don't exercise the service worker, so block it.
test.use({ serviceWorkers: 'block' });

// Queue auto-advance coverage (Phase 1). Claude Code Mastery episodes play
// through the chunked fallback (per-line manifests, no combined.mp3); stubbing window.Audio with instantly-ending chunks lets
// an episode "finish" in a couple of seconds without decoding real MP3s
// (same pattern as the chapter-markers test in player.spec.js).

function installInstantAudio(page) {
  return page.addInitScript(() => {
    // Event-capable fake: the app's continuous mode wires addEventListener on
    // a module-scope `new Audio()` singleton, so the fake must emit real
    // play/pause/ended events — an "ended" fires shortly after play(), which
    // finishes both continuous episodes and individual chunks instantly.
    window.Audio = class FakeAudio {
      constructor(src) {
        this._listeners = {};
        this.src = src || '';
        this.preload = '';
        this.playbackRate = 1;
        this.paused = true;
        this.currentTime = 0;
        this.duration = NaN;
        this.onended = null;
        this.onerror = null;
      }
      addEventListener(ev, fn) { (this._listeners[ev] = this._listeners[ev] || []).push(fn); }
      removeEventListener(ev, fn) { this._listeners[ev] = (this._listeners[ev] || []).filter((f) => f !== fn); }
      _emit(ev) {
        (this._listeners[ev] || []).forEach((f) => { try { f(); } catch { /* ignore */ } });
        if (ev === 'ended' && typeof this.onended === 'function') this.onended();
      }
      load() {}
      setAttribute() {}
      play() {
        this.paused = false;
        this._emit('play');
        setTimeout(() => { if (!this.paused) { this.paused = true; this._emit('ended'); } }, 20);
        return Promise.resolve();
      }
      pause() { this.paused = true; this._emit('pause'); }
    };
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

test('finishing an episode auto-advances to the next one after the countdown', async ({ page }) => {
  await installInstantAudio(page);
  await openEpisode(page);

  // Auto-play defaults to on.
  await expect(page.locator('#auto-play-toggle')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#play-btn').click();

  const modal = page.locator('#complete-modal');
  await expect(modal).toHaveClass(/show/, { timeout: 30000 });
  await expect(page.locator('#complete-message')).toContainText('Starting "Core Commands & Navigation" in 5 seconds');
  await expect(page.locator('#play-next-episode')).toHaveText('Play Now');

  // The 5-second countdown fires the advance on its own — no click.
  await expect(page.locator('#player-episode-title')).toContainText('Core Commands & Navigation', { timeout: 15000 });
});

test('a queued episode takes precedence over the sequential next episode', async ({ page }) => {
  await installInstantAudio(page);
  await page.addInitScript(() => {
    localStorage.setItem('playQueue', JSON.stringify([
      { podcastId: 'claude-code-mastery', episodeNum: 3, addedAt: Date.now() }
    ]));
  });
  await openEpisode(page);
  await page.locator('#play-btn').click();

  await expect(page.locator('#complete-modal')).toHaveClass(/show/, { timeout: 30000 });
  await expect(page.locator('#complete-message')).toContainText('Code Reading & Editing');

  // "Play Now" advances immediately and consumes the queue entry.
  await page.locator('#play-next-episode').click();
  await expect(page.locator('#player-episode-title')).toContainText('Code Reading');
  await expect.poll(() =>
    page.evaluate(() => JSON.parse(localStorage.getItem('playQueue') || '[]').length)
  ).toBe(0);
});

test('auto-advance is suppressed when the Auto toggle is off', async ({ page }) => {
  await installInstantAudio(page);
  await openEpisode(page);

  await page.locator('#auto-play-toggle').click();
  await expect(page.locator('#auto-play-toggle')).toHaveAttribute('aria-pressed', 'false');
  await page.locator('#play-btn').click();

  await expect(page.locator('#complete-modal')).toHaveClass(/show/, { timeout: 30000 });
  await expect(page.locator('#complete-message')).toContainText('Up next: "Core Commands & Navigation"');
  await expect(page.locator('#play-next-episode')).toHaveText('Play Next Episode');

  // Past the 5s window nothing has advanced — the modal still offers a manual play.
  await page.waitForTimeout(5500);
  await expect(page.locator('#player-episode-title')).toContainText('Getting Started with Claude Code');
  await expect(page.locator('#complete-modal')).toHaveClass(/show/);
});
