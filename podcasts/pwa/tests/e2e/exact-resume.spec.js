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

test('an idle tab preserves newer progress on exit, and a deliberate rewind wins', async ({ page, context }) => {
  const url = `/?podcast=${show}&episode=4`;
  await page.goto(url);
  await page.locator('.transcript-line[data-index="9"]').click();
  const newer = await context.newPage();
  await captureNativePlayer(newer);
  await newer.goto(url);
  await expect(newer.locator('#player-view')).toHaveClass(/active/);
  await pauseAt(newer, 2670);
  const latest = await savedPosition(newer, 4);
  expect(latest.positionSeconds).toBeCloseTo(2670, 0);

  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')));
  expect(await savedPosition(newer, 4)).toEqual(latest);
  await page.locator('.transcript-line[data-index="2"]').click();
  const rewind = await savedPosition(page, 4);
  expect(rewind.line).toBe(2);
  expect(rewind.positionSeconds).toBeLessThan(latest.positionSeconds);
  await newer.close({ runBeforeUnload: true });
  expect(await savedPosition(page, 4)).toEqual(rewind);
});

test('going Home cancels an in-flight episode selection while preserving the mini player', async ({ page }) => {
  await page.goto(`/?podcast=${show}&episode=4`);
  await expect(page.locator('#player-view')).toHaveClass(/active/);
  await page.locator('#back-to-list').click();
  const script = '**/transcripts/**/episode-05-*.md*';
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  await page.route(script, async route => { await gate; await route.continue(); });
  const pending = page.waitForRequest(script);
  await page.locator('.episode-card[data-episode-id="5"]').click();
  await pending;
  await page.locator('#back-to-podcasts').click();
  const finished = page.waitForResponse(script);
  release();
  await (await finished).finished();
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await expect(page.locator('#podcasts-view')).toHaveClass(/active/);
  await page.locator('#mini-player-open').click();
  await expect(page.locator('#player-episode-title')).toHaveText('Evals, Guardrails, and Reliability');
});

test('whole-episode sharing drops a deep link position while timestamp sharing preserves it', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', { value: async ({ url }) => { window.sharedURL = url; } });
  });
  await page.goto(`/?podcast=${show}&episode=4&line=9`);
  await page.locator('#share-btn').click();
  await page.locator('#share-timestamp-btn').click();
  expect(new URL(await page.evaluate(() => window.sharedURL)).searchParams.get('line')).toBe('9');
  await page.locator('#share-episode-btn').click();
  const url = new URL(await page.evaluate(() => window.sharedURL));
  expect(url.searchParams.get('line')).toBeNull();
  expect(url.searchParams.get('episode')).toBe('4');
});

test('following playback scrolls only the transcript, and collapse hides its controls', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await captureNativePlayer(page);
  await page.goto(`/?podcast=${show}&episode=4`);
  await page.locator('#play-btn').click();
  await page.evaluate(() => window.scrollTo(0, 0));
  const line = page.locator('.transcript-line.current');
  const previous = await line.getAttribute('data-index');
  await page.evaluate(() => { window.podcastAudio.currentTime = 240; });
  await expect(line).not.toHaveAttribute('data-index', previous);
  await expect.poll(() => page.locator('#transcript-content').evaluate(el => el.scrollTop)).toBeGreaterThan(0);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  const header = page.locator('#transcript-panel .panel-header');
  await header.click();
  await expect(header).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('#transcript-content')).toBeHidden();
  await expect(page.locator('#transcript-search-input')).toBeHidden();
  await header.click();
  await expect(page.locator('#transcript-content')).toBeVisible();
  await expect(page.locator('#transcript-search-input')).toBeVisible();
});

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
