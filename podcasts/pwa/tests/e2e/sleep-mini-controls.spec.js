import { test, expect } from '@playwright/test';

// First-visit SW activation (skipWaiting + clients.claim) triggers a
// controllerchange reload that can land mid-test and bounce the app back to
// home. These tests don't exercise the service worker, so block it.
test.use({ serviceWorkers: 'block' });

// Deeper sleep-timer and mini-player coverage (Phases 1-2), extending the
// surface-level checks in player.spec.js: end-of-episode sleep mode and its
// interaction with auto-advance, plus the mini player's inline play/pause
// control and keyboard expand.

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

// Chunks that end instantly — an episode "finishes" in a couple of seconds.
function installInstantAudio(page) {
  return page.addInitScript(() => {
    window.Audio = class FakeAudio {
      constructor(src) {
        this.src = src;
        this.preload = '';
        this.playbackRate = 1;
        this.paused = true;
        this.onended = null;
        this.onerror = null;
      }
      play() {
        this.paused = false;
        setTimeout(() => {
          if (typeof this.onended === 'function') this.onended();
        }, 20);
        return Promise.resolve();
      }
      pause() {
        this.paused = true;
      }
    };
  });
}

// Chunks that never end — playback state stays "playing" deterministically.
function installLingeringAudio(page) {
  return page.addInitScript(() => {
    window.Audio = class FakeAudio {
      constructor(src) {
        this.src = src;
        this.preload = '';
        this.playbackRate = 1;
        this.paused = true;
        this.onended = null;
        this.onerror = null;
      }
      play() {
        this.paused = false;
        return Promise.resolve();
      }
      pause() {
        this.paused = true;
      }
    };
  });
}

test('sleep timer supports switching between minute and end-of-episode modes', async ({ page }) => {
  await openEpisode(page);

  await page.locator('#sleep-timer-btn').click();
  await page.locator('.timer-btn[data-episode-end="true"]').click();
  await expect(page.locator('#timer-display')).toContainText('Stopping at end of episode');
  await expect(page.locator('.timer-btn[data-episode-end="true"]')).toHaveClass(/active/);

  // Switching to a minute preset replaces the end-of-episode stop.
  await page.locator('.timer-btn[data-minutes="15"]').click();
  await expect(page.locator('#timer-display')).toContainText('Stopping in 15:00');
  await expect(page.locator('.timer-btn[data-episode-end="true"]')).not.toHaveClass(/active/);

  await page.locator('#cancel-timer').click();
  await expect(page.locator('#timer-display')).toContainText('No timer set');
  await page.locator('#close-sleep-modal').click();
  await expect(page.locator('#sleep-chip')).toBeHidden();
});

test('end-of-episode sleep stop suppresses queue auto-advance', async ({ page }) => {
  await installInstantAudio(page);
  await openEpisode(page);

  // Auto-play is on, but an end-of-episode sleep stop must override it.
  await expect(page.locator('#auto-play-toggle')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#sleep-timer-btn').click();
  await page.locator('.timer-btn[data-episode-end="true"]').click();
  await expect(page.locator('#timer-display')).toContainText('Stopping at end of episode');
  await page.locator('#close-sleep-modal').click();
  await expect(page.locator('#sleep-chip')).toBeVisible();

  await page.locator('#play-btn').click();
  await expect(page.locator('#complete-modal')).toHaveClass(/show/, { timeout: 30000 });

  // No countdown message — just a manual "Play Next Episode" offer.
  await expect(page.locator('#complete-message')).toContainText('Up next:');
  await expect(page.locator('#play-next-episode')).toHaveText('Play Next Episode');

  // The consumed sleep stop clears all sleep UI state.
  await expect(page.locator('#sleep-chip')).toBeHidden();
  await expect(page.locator('#sleep-timer-btn')).not.toHaveClass(/sleep-active/);
});

test('mini player play button toggles playback without expanding', async ({ page }) => {
  await installLingeringAudio(page);
  await openEpisode(page);

  await page.locator('#back-to-list').click();
  await expect(page.locator('#list-view')).toHaveClass(/active/);
  await expect(page.locator('#mini-player')).toHaveClass(/active/);

  // Play from the mini player: state flips, but the view must NOT expand.
  await page.locator('#mini-play-btn').click();
  await expect(page.locator('#mini-play-btn')).toHaveClass(/playing/);
  await expect(page.locator('#mini-play-btn')).toHaveAttribute('aria-label', 'Pause');
  await expect(page.locator('#list-view')).toHaveClass(/active/);
  await expect(page.locator('#player-view')).not.toHaveClass(/active/);

  // Pause from the mini player, still without expanding.
  await page.locator('#mini-play-btn').click();
  await expect(page.locator('#mini-play-btn')).not.toHaveClass(/playing/);
  await expect(page.locator('#mini-play-btn')).toHaveAttribute('aria-label', 'Play');
  await expect(page.locator('#list-view')).toHaveClass(/active/);
});

test('mini player expands to the player with the keyboard', async ({ page }) => {
  await openEpisode(page);

  await page.locator('#back-to-list').click();
  await expect(page.locator('#mini-player')).toHaveClass(/active/);

  await page.locator('#mini-player-open').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#player-view')).toHaveClass(/active/);
  await expect(page.locator('#mini-player')).not.toHaveClass(/active/);
});
