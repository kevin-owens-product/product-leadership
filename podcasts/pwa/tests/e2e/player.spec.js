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
