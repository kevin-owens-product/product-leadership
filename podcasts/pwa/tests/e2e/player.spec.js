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

  const episodeCard = page.locator('.episode-card:has-text("AI-Native Product Management")').first();
  await expect(episodeCard).toHaveAttribute('role', 'button');
  await episodeCard.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#player-view')).toHaveClass(/active/);

  const autoPlayToggle = page.locator('#auto-play-toggle');
  await expect(autoPlayToggle).toHaveAttribute('aria-pressed', 'true');
  await autoPlayToggle.focus();
  await page.keyboard.press('Space');
  await expect(autoPlayToggle).toHaveAttribute('aria-pressed', 'false');
});

test('AI Native PM shows stable chapter markers and playback advances', async ({ page }) => {
  await page.addInitScript(() => {
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
        { rawLine: 11, file: '0000.mp3' },
        { rawLine: 13, file: '0001.mp3' }
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
