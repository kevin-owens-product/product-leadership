import { test, expect } from '@playwright/test';

test.use({ serviceWorkers: 'block', reducedMotion: 'reduce' });

const show = 'agentic-coding-frontier';
const savedPosition = (page, id) => page.evaluate(key =>
  JSON.parse(localStorage.getItem('tlu_podcast_state')).episodeProgress[key], `${show}-${id}`);

async function captureNativePlayer(page) {
  await page.addInitScript(() => {
    const NativeAudio = window.Audio;
    window.Audio = function (...args) {
      const audio = new NativeAudio(...args);
      if (!window.podcastAudio) {
        window.podcastAudio = audio;
        window.sourceLoads = 0;
        audio.addEventListener('loadstart', () => { window.sourceLoads++; });
      }
      return audio;
    };
  });
}

async function pauseAt(page, seconds) {
  await page.locator('#play-btn').click();
  await expect.poll(() => page.evaluate(() => window.podcastAudio.readyState)).toBeGreaterThanOrEqual(2);
  await page.evaluate(position => new Promise(resolve => {
    const audio = window.podcastAudio;
    audio.addEventListener('seeked', () => { audio.pause(); resolve(); }, { once: true });
    audio.currentTime = position;
  }), seconds);
  await expect(page.locator('#play-btn')).toHaveAttribute('aria-label', 'Play');
}

async function returnHome(page) {
  await page.locator('#back-to-list').click();
  await page.locator('#back-to-podcasts').click();
}

const continueCard = (page, id) => page.locator(`#continue-listening .continue-card[data-podcast-id="${show}"][data-episode-id="${id}"]`);

test('Continue plays at 44:30 after reopening and reuses an already playing or paused MP3', async ({ page }) => {
  await captureNativePlayer(page);
  await page.goto(`/?podcast=${show}&episode=4`);
  await expect(page.locator('#player-view')).toHaveClass(/active/);
  // 44:30 is over a minute into a single transcript line in this release.
  await pauseAt(page, 2670);
  const saved = await savedPosition(page, 4);
  expect(saved.positionSeconds).toBeCloseTo(2670, 0);
  expect(saved.finished).toBe(false);

  await page.goto('/');
  await continueCard(page, 4).click();
  await expect(page.locator('#play-btn')).toHaveAttribute('aria-label', 'Pause');
  await expect.poll(() => page.evaluate(() => window.podcastAudio.currentTime)).toBeGreaterThan(2670);
  expect(await page.evaluate(() => window.podcastAudio.currentTime)).toBeLessThan(2680);
  const loads = await page.evaluate(() => window.sourceLoads);

  await returnHome(page);
  const before = await page.evaluate(() => window.podcastAudio.currentTime);
  await continueCard(page, 4).click();
  await expect(page.locator('#play-btn')).toHaveAttribute('aria-label', 'Pause');
  expect(await page.evaluate(() => window.podcastAudio.currentTime)).toBeGreaterThanOrEqual(before);
  await page.locator('#play-btn').click();
  await returnHome(page);
  await continueCard(page, 4).click();
  await expect(page.locator('#play-btn')).toHaveAttribute('aria-label', 'Pause');
  expect(await page.evaluate(() => window.sourceLoads)).toBe(loads);
});

test('an interrupted final line and outro reopen at the saved time while an explicit shared line wins', async ({ page }) => {
  await captureNativePlayer(page);
  const url = `/?podcast=${show}&episode=6`;
  await page.goto(url);
  await expect(page.locator('#player-view')).toHaveClass(/active/);
  // Episode 6 has a short outro after the final timestamped transcript line.
  await pauseAt(page, 2670);
  const saved = await savedPosition(page, 6);
  expect(saved.positionSeconds).toBeCloseTo(2670, 0);
  expect(saved.finished).toBe(false);
  await page.goto('/');
  await expect(continueCard(page, 6)).toBeVisible();
  await page.goto(url);
  await expect(page.locator('#resume-banner')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.podcastAudio.readyState)).toBeGreaterThanOrEqual(1);
  expect(await page.evaluate(() => window.podcastAudio.currentTime)).toBeCloseTo(2670, 0);
  await expect(page.locator('.transcript-line').last()).toHaveClass(/current/);
  await page.goto(`${url}&line=2`);
  await expect(page.locator('.transcript-line[data-index="2"]')).toHaveClass(/current/);
  await expect(page.locator('#resume-banner')).toBeHidden();
});
