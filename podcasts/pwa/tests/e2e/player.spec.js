import { test, expect } from '@playwright/test';

test('loads home and can open player shell', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#podcasts-view')).toBeVisible();

  const firstCard = page.locator('.podcast-card').first();
  await expect(firstCard).toBeVisible();
  await firstCard.click();

  await expect(page.locator('#list-view')).toHaveClass(/active/);

  const firstEpisode = page.locator('.episode-card').first();
  await firstEpisode.click();

  await expect(page.locator('#player-view')).toHaveClass(/active/);
  await expect(page.locator('#play-btn')).toBeVisible();
});

test('transcript search handles regex-like input without crash', async ({ page }) => {
  await page.goto('/');
  await page.locator('.podcast-card').first().click();
  await page.locator('.episode-card').first().click();

  await page.fill('#transcript-search-input', 'a+b?(c)[d]');
  await expect(page.locator('#transcript-search-input')).toHaveValue('a+b?(c)[d]');
});

test('settings shows TTS background playback notice', async ({ page }) => {
  await page.goto('/');
  await page.locator('.podcast-card').first().click();
  await page.locator('.episode-card').first().click();

  await page.locator('#settings-panel .panel-header').click();
  await expect(page.locator('#tts-background-notice')).toContainText('Background playback note');
});

test('AI Native PM shows stable chapter markers and playback advances', async ({ page }) => {
  await page.addInitScript(() => {
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.getVoices = () => [
      { name: 'Test Voice A', lang: 'en-US' },
      { name: 'Test Voice B', lang: 'en-US' }
    ];
    synth.speak = (utterance) => {
      setTimeout(() => {
        if (typeof utterance.onend === 'function') utterance.onend();
      }, 20);
    };
    synth.cancel = () => {};
    synth.pause = () => {};
    synth.resume = () => {};
  });

  await page.goto('/');
  await page.locator('.podcast-card:has-text("The Forge Podcast")').click();
  await page.locator('.episode-card:has-text("AI-Native Product Management")').click();

  await expect(page.locator('#chapters-list .chapter-time').first()).toHaveText('00:00 · 3 min');
  await expect(page.locator('#chapters-list .chapter-time').nth(1)).toHaveText('03:00 · 22 min');

  const initialPosition = await page.locator('#current-pos').textContent();
  await page.locator('#play-btn').click();
  await expect.poll(async () => page.locator('#current-pos').textContent()).not.toBe(initialPosition);
});
