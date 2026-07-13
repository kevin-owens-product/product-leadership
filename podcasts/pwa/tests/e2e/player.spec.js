import { test, expect } from '@playwright/test';

async function openEpisode(page, podcastTitle = 'The Forge Podcast', episodeTitle = 'AI-Native Product Management') {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => {});
  await expect(page.locator('#podcasts-view')).toBeVisible();

  const podcastCard = page.locator(`.podcast-card:has-text("${podcastTitle}")`).first();
  await expect(podcastCard).toBeVisible();
  await podcastCard.click();

  const episodeCard = page.locator(`.episode-card:has-text("${episodeTitle}")`).first();
  await expect(episodeCard).toBeVisible();
  await episodeCard.click();
  await expect(page.locator('#player-view')).toHaveClass(/active/);
}

test('loads home and can open player shell', async ({ page }) => {
  await openEpisode(page);
  await expect(page.locator('#play-btn')).toBeVisible();
});

test('transcript search handles regex-like input without crash', async ({ page }) => {
  await openEpisode(page);

  await page.fill('#transcript-search-input', 'a+b?(c)[d]');
  await expect(page.locator('#transcript-search-input')).toHaveValue('a+b?(c)[d]');
});

test('settings shows generated audio background playback notice', async ({ page }) => {
  await openEpisode(page);

  // Settings live in the ⋯ options sheet since the D3 player redesign.
  await page.locator('#player-more-btn').click();
  await expect(page.locator('#player-more-sheet')).toHaveClass(/show/);
  await page.locator('#settings-panel .panel-header').click();
  await expect(page.locator('#tts-background-notice')).toContainText('Background playback note');
});

test('card navigation and player toggles are keyboard accessible', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => {});

  const podcastCard = page.locator('.podcast-card:has-text("The Forge Podcast")').first();
  await expect(podcastCard).toHaveAttribute('role', 'button');
  await podcastCard.focus();
  await page.keyboard.press('Enter');
  // View swaps go through a View Transition (async by a frame), so wait for
  // the list view before focusing an element inside it.
  await expect(page.locator('#list-view')).toHaveClass(/active/);

  const episodeCard = page.locator('.episode-card:has-text("AI-Native Product Management")').first();
  await expect(episodeCard).toHaveAttribute('role', 'button');
  await expect(episodeCard).toBeVisible();
  await episodeCard.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#player-view')).toHaveClass(/active/);

  const autoPlayToggle = page.locator('#auto-play-toggle');
  await expect(autoPlayToggle).toHaveAttribute('aria-pressed', 'true');
  await autoPlayToggle.focus();
  await page.keyboard.press('Space');
  await expect(autoPlayToggle).toHaveAttribute('aria-pressed', 'false');
});

test.describe('chapter markers (stubbed manifest)', () => {
  // The SW fetches bypass page.route — block it so the manifest stub wins.
  test.use({ serviceWorkers: 'block' });

  test('AI Native PM shows stable chapter markers and playback advances', async ({ page }) => {
  await page.addInitScript(() => {
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
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.getVoices = () => [
      { name: 'Test Voice A', lang: 'en-US' },
      { name: 'Test Voice B', lang: 'en-US' }
    ];
    synth.cancel = () => {};
  });

  await page.route('**/audio/the-forge-podcast/episode-04-ai-native-product-management/manifest.json*', route => {
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify([
        { rawLine: 10, file: '0000.mp3' },
        { rawLine: 12, file: '0001.mp3' }
      ])
    });
  });

  await page.route('**/audio/the-forge-podcast/episode-04-ai-native-product-management/*.mp3*', route => {
    route.fulfill({
      contentType: 'audio/mpeg',
      body: ''
    });
  });

  await page.goto('/');
  await openEpisode(page);

  await expect(page.locator('#chapters-list .chapter-time').first()).toHaveText(/^00:00 · \d+ min$/);
  await expect(page.locator('#chapters-list .chapter-time').nth(1)).toHaveText(/^\d{2}:\d{2} · \d+ min$/);

  const initialPosition = await page.locator('#current-pos').textContent();
  await page.locator('#play-btn').click();
  await expect.poll(async () => page.locator('#current-pos').textContent()).not.toBe(initialPosition);
});
});

test('keyboard shortcuts overlay opens with ? but not while typing', async ({ page }) => {
  await openEpisode(page);
  // Move focus off the episode card (role=button targets are ignored by shortcuts).
  await page.evaluate(() => document.activeElement?.blur?.());

  await page.keyboard.press('?');
  await expect(page.locator('#shortcuts-modal')).toHaveClass(/show/);
  await expect(page.locator('#shortcuts-modal')).toContainText('Play / Pause');
  await page.locator('#close-shortcuts-modal').click();
  await expect(page.locator('#shortcuts-modal')).not.toHaveClass(/show/);

  // Typing "?" inside an input must not open the overlay.
  await page.locator('#transcript-search-input').click();
  await page.keyboard.press('?');
  await expect(page.locator('#shortcuts-modal')).not.toHaveClass(/show/);
  await expect(page.locator('#transcript-search-input')).toHaveValue('?');
});

test('mini player persists on non-player screens and expands back to the player', async ({ page }) => {
  await openEpisode(page);

  // Player screen: no mini player.
  await expect(page.locator('#mini-player')).not.toHaveClass(/active/);

  // Episode list: mini player shows the loaded episode.
  await page.locator('#back-to-list').click();
  await expect(page.locator('#list-view')).toHaveClass(/active/);
  await expect(page.locator('#mini-player')).toHaveClass(/active/);
  await expect(page.locator('#mini-player-title')).toContainText('AI-Native Product Management');
  await expect(page.locator('#mini-player-subtitle')).toContainText('The Forge Podcast');

  // Tap-to-expand returns to the player and hides the bar.
  await page.locator('#mini-player-title').click();
  await expect(page.locator('#player-view')).toHaveClass(/active/);
  await expect(page.locator('#mini-player')).not.toHaveClass(/active/);

  // Home screen keeps the mini player too. ("Go to Home" moved into the
  // ⋯ options sheet in the D3 player redesign.)
  await page.locator('#player-more-btn').click();
  await page.locator('#home-from-player').click();
  await expect(page.locator('#podcasts-view')).toHaveClass(/active/);
  await expect(page.locator('#mini-player')).toHaveClass(/active/);
});

test('mini player expands to the player after browsing a different show', async ({ page }) => {
  await openEpisode(page);

  // Browse away from the playing show: player → episode list → home →
  // another show's episode list. The mini player follows the whole way.
  await page.locator('#back-to-list').click();
  await expect(page.locator('#list-view')).toHaveClass(/active/);
  await page.locator('#back-to-podcasts').click();
  await expect(page.locator('#podcasts-view')).toHaveClass(/active/);
  await page.locator('.podcast-card:has-text("Agentic Coding Frontier")').first().click();
  await expect(page.locator('#list-view')).toHaveClass(/active/);
  await expect(page.locator('#current-podcast-title')).toContainText('Agentic Coding Frontier');
  await expect(page.locator('#mini-player')).toHaveClass(/active/);

  // Expanding must land on the player AND restore the playing show's context.
  await page.locator('#mini-player-title').click();
  await expect(page.locator('#player-view')).toHaveClass(/active/);
  await expect(page.locator('#current-podcast-title')).toContainText('The Forge Podcast');

  // Regression guard: openPodcast() used to route through a View Transition
  // whose deferred callback re-activated list-view over the player ~a frame
  // (or transition duration) later. Give any stray transition time to finish
  // and confirm the player is still the active view.
  await page.waitForTimeout(700);
  await expect(page.locator('#player-view')).toHaveClass(/active/);
  await expect(page.locator('#list-view')).not.toHaveClass(/active/);
  await expect(page.locator('#mini-player')).not.toHaveClass(/active/);
});

test('play button uses the morphing icon and reflects playback state', async ({ page }) => {
  await openEpisode(page);
  await expect(page.locator('#play-btn .play-pause-icon')).toBeVisible();
  await expect(page.locator('#play-btn')).not.toHaveClass(/playing/);
});

test('sleep timer surfaces a visible countdown and can be cancelled', async ({ page }) => {
  await openEpisode(page);

  await page.locator('#sleep-timer-btn').click();
  await page.locator('.timer-btn[data-minutes="5"]').click();
  await expect(page.locator('#timer-display')).toContainText('Stopping in');
  await page.locator('#close-sleep-modal').click();

  await expect(page.locator('#sleep-chip')).toBeVisible();
  await expect(page.locator('#sleep-timer-btn')).toHaveClass(/sleep-active/);

  // The chip re-opens the sleep modal; cancelling clears all sleep UI state.
  await page.locator('#sleep-chip').click();
  await page.locator('#cancel-timer').click();
  await expect(page.locator('#timer-display')).toContainText('No timer set');
  await page.locator('#close-sleep-modal').click();
  await expect(page.locator('#sleep-chip')).toBeHidden();
  await expect(page.locator('#sleep-timer-btn')).not.toHaveClass(/sleep-active/);
});

test('transcript resync pill appears on user scroll and re-follows on tap', async ({ page }) => {
  await openEpisode(page);

  const pill = page.locator('#transcript-resync');
  await expect(pill).toBeHidden();

  // A deliberate wheel scroll over the transcript leaves follow mode.
  const transcript = page.locator('#transcript-content');
  await transcript.hover();
  await page.mouse.wheel(0, 300);
  await expect(pill).toBeVisible();

  // Tapping the pill re-engages follow mode and hides itself.
  await pill.click();
  await expect(pill).toBeHidden();

  // Tapping a transcript line (seek) also re-engages follow mode.
  await page.mouse.wheel(0, 300);
  await expect(pill).toBeVisible();
  await page.locator('.transcript-line').nth(3).click();
  await expect(pill).toBeHidden();
});

test('now-playing visualizer strip is present and marked decorative', async ({ page }) => {
  await openEpisode(page);

  const viz = page.locator('#now-playing-viz');
  await expect(viz).toBeVisible();
  await expect(viz).toHaveAttribute('aria-hidden', 'true');
});

test('now-playing visualizer is hidden under prefers-reduced-motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openEpisode(page);
  await expect(page.locator('#now-playing-viz')).toBeHidden();
});

test.describe('offline download failure', () => {
  // The SW performs its own fetches, which page.route cannot intercept —
  // block it so the aborted manifest request actually reaches the app.
  test.use({ serviceWorkers: 'block' });

  test('failed offline download surfaces a retry toast', async ({ page }) => {
  // No audio manifest reachable -> download must fail and surface a toast.
  await page.route('**/audio/**/manifest.json*', route => route.abort());

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.locator('.podcast-card:has-text("The Forge Podcast")').first().click();
  await expect(page.locator('#list-view')).toHaveClass(/active/);

  await page.locator('.episode-card .ep-download-btn').first().click();

  const toast = page.locator('#toast-region .toast');
  await expect(toast).toBeVisible();
  await expect(toast).toContainText('Download failed');
  await expect(toast.locator('.toast-action')).toHaveText('Retry');

  // The close button dismisses without acting.
  await toast.locator('.toast-close').click();
  await expect(page.locator('#toast-region .toast')).toHaveCount(0);
});
});

test('transcript lines, chapters, and panel headers are accessible controls', async ({ page }) => {
  await openEpisode(page);

  const line = page.locator('.transcript-line').first();
  await expect(line).toHaveAttribute('role', 'button');
  await expect(line).toHaveAttribute('tabindex', '0');

  const chapter = page.locator('.chapter-item').first();
  await expect(chapter).toHaveAttribute('role', 'button');
  await expect(chapter).toHaveAttribute('tabindex', '0');

  // Collapsible panel headers expose their expanded state (the settings
  // accordion now lives in the ⋯ options sheet).
  await page.locator('#player-more-btn').click();
  const header = page.locator('#settings-panel .panel-header');
  await expect(header).toHaveAttribute('aria-expanded', 'false');
  await header.click();
  await expect(header).toHaveAttribute('aria-expanded', 'true');
});

test('speed popover closes with Escape and returns focus to its trigger', async ({ page }) => {
  await openEpisode(page);

  await page.locator('#speed-btn').click();
  await expect(page.locator('#speed-popover')).toBeVisible();
  await expect(page.locator('#speed-btn')).toHaveAttribute('aria-expanded', 'true');

  await page.keyboard.press('Escape');
  await expect(page.locator('#speed-popover')).toBeHidden();
  await expect(page.locator('#speed-btn')).toBeFocused();
});
