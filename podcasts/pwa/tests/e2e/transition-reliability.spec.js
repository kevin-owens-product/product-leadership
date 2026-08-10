import { test, expect } from '@playwright/test';

test.use({ serviceWorkers: 'block' });

function installControlledAudio(page, { failFirstEpisode5Play = false } = {}) {
  return page.addInitScript(({ shouldFailEpisode5 }) => {
    const instances = [];
    window.__audioInstances = instances;

    window.Audio = class ControlledAudio {
      constructor(src = '') {
        this._listeners = {};
        this.src = src;
        this.currentSrc = src;
        this.preload = '';
        this.playbackRate = 1;
        this.volume = 1;
        this.paused = true;
        this.currentTime = 0;
        this.duration = 600;
        this.error = null;
        this.buffered = { length: 0, start: () => 0, end: () => 0 };
        this.playCalls = [];
        this.failedEpisode5 = false;
        instances.push(this);
        if (instances.length === 1) window.__sharedAudio = this;
      }

      addEventListener(event, handler) {
        (this._listeners[event] = this._listeners[event] || []).push(handler);
      }

      removeEventListener(event, handler) {
        this._listeners[event] = (this._listeners[event] || []).filter((item) => item !== handler);
      }

      setAttribute() {}

      removeAttribute(name) {
        if (name === 'src') {
          this.src = '';
          this.currentSrc = '';
        }
      }

      load() {
        this.currentSrc = this.src;
      }

      _emit(event) {
        for (const handler of this._listeners[event] || []) handler();
        if (event === 'ended' && typeof this.onended === 'function') this.onended();
        if (event === 'error' && typeof this.onerror === 'function') this.onerror();
      }

      play() {
        this.currentSrc = this.src;
        this.playCalls.push(this.src);
        if (
          shouldFailEpisode5
          && this === window.__sharedAudio
          && this.src.includes('episode-05-supplier-management')
          && !this.failedEpisode5
        ) {
          this.failedEpisode5 = true;
          this.paused = true;
          // One browser failure produces both signals in real Chromium. The
          // recovery coordinator must dedupe them into one retry.
          this.error = { code: 4, message: 'MEDIA_ELEMENT_ERROR: Format error' };
          this._emit('error');
          return Promise.reject(new DOMException('play interrupted', 'AbortError'));
        }
        this.error = null;
        this.paused = false;
        this._emit('play');
        return Promise.resolve();
      }

      pause() {
        const wasPaused = this.paused;
        this.paused = true;
        if (!wasPaused) this._emit('pause');
      }

      finish() {
        this.paused = true;
        this._emit('ended');
      }
    };
  }, { shouldFailEpisode5: failFirstEpisode5Play });
}

async function openApEpisode(page, number) {
  await page.goto(`/?podcast=ap-finance-mastery&episode=${number}`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#player-view')).toHaveClass(/active/, { timeout: 20000 });
}

test('background auto-advance keeps podcast audio on the native media path', async ({ page }) => {
  let nextManifestRequests = 0;
  await page.route('**/audio/ap-finance-mastery/episode-05-supplier-management/manifest.json*', route => {
    nextManifestRequests += 1;
    void route.continue();
  });
  await page.addInitScript(() => {
    window.__audioContextConstructions = 0;
    class ForbiddenAudioContext {
      constructor() {
        window.__audioContextConstructions += 1;
        throw new Error('Podcast audio must not be routed through Web Audio');
      }
    }
    Object.defineProperty(window, 'AudioContext', {
      configurable: true,
      value: ForbiddenAudioContext
    });
    Object.defineProperty(window, 'webkitAudioContext', {
      configurable: true,
      value: ForbiddenAudioContext
    });
  });
  await installControlledAudio(page);
  await openApEpisode(page, 4);
  const nextManifestLoaded = page.waitForResponse(response =>
    response.url().includes('/episode-05-supplier-management/manifest.json') && response.ok()
  );
  await page.locator('#play-btn').click();
  await expect(page.locator('#play-btn')).toHaveAttribute('aria-label', 'Pause');
  await nextManifestLoaded;
  await expect.poll(() => nextManifestRequests).toBeGreaterThan(0);

  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'hidden'
    });
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => true
    });
    document.dispatchEvent(new Event('visibilitychange'));
    window.__sharedAudio.finish();
  });

  await expect(page.locator('#player-episode-title')).toContainText(
    'Supplier Management & Spend Analytics',
    { timeout: 15000 }
  );
  await expect(page.locator('#play-btn')).toHaveAttribute('aria-label', 'Pause');
  await expect.poll(() => page.evaluate(() =>
    window.__sharedAudio.playCalls.some((src) => src.includes('episode-05-supplier-management'))
  )).toBe(true);
  expect(await page.evaluate(() => window.__audioContextConstructions)).toBe(0);
});

test('native media retries a transient first-range failure during auto-advance', async ({ page }) => {
  await page.addInitScript(() => {
    const NativeAudio = window.Audio;
    const captured = [];
    function CapturingAudio(...args) {
      const audio = new NativeAudio(...args);
      captured.push(audio);
      if (captured.length === 1) window.__sharedAudio = audio;
      return audio;
    }
    CapturingAudio.prototype = NativeAudio.prototype;
    window.Audio = CapturingAudio;
    window.__audioInstances = captured;
  });

  let episode5CombinedRequests = 0;
  await page.route('**/audio/ap-finance-mastery/episode-05-supplier-management/combined.mp3*', route => {
    episode5CombinedRequests += 1;
    if (episode5CombinedRequests === 1) {
      void route.abort('connectionfailed');
    } else {
      void route.continue();
    }
  });

  await openApEpisode(page, 4);
  await page.locator('#play-btn').click();
  await expect(page.locator('#play-btn')).toHaveAttribute('aria-label', 'Pause', { timeout: 15000 });
  await page.evaluate(() => {
    window.__sharedAudio.pause();
    window.__sharedAudio.dispatchEvent(new Event('ended'));
  });

  await expect(page.locator('#player-episode-title')).toContainText(
    'Supplier Management & Spend Analytics',
    { timeout: 15000 }
  );
  await expect(page.locator('#play-btn')).toHaveAttribute('aria-label', 'Pause', { timeout: 15000 });
  expect(episode5CombinedRequests).toBeGreaterThanOrEqual(2);
  expect(await page.evaluate(() => window.__audioInstances.length)).toBe(1);
  await expect(page.locator('#toast-region .toast', { hasText: "Episode audio isn't loading" })).toHaveCount(0);
  await expect(page.locator('#toast-region .toast', { hasText: 'Audio failed for a line' })).toHaveCount(0);
});

test('auto-advance retries one transition failure without creating line players', async ({ page }) => {
  await installControlledAudio(page, { failFirstEpisode5Play: true });
  await openApEpisode(page, 4);
  await page.locator('#play-btn').click();
  await expect(page.locator('#play-btn')).toHaveAttribute('aria-label', 'Pause');

  await page.evaluate(() => window.__sharedAudio.finish());
  await expect(page.locator('#complete-modal')).toHaveClass(/show/);

  // Let the real five-second auto-advance fire; this is deliberately not a
  // click/gesture, matching the reported end-of-episode handoff.
  await expect(page.locator('#player-episode-title')).toContainText(
    'Supplier Management & Spend Analytics',
    { timeout: 15000 }
  );
  await expect(page.locator('#play-btn')).toHaveAttribute('aria-label', 'Pause', { timeout: 10000 });
  await expect.poll(() => page.evaluate(() =>
    window.__sharedAudio.playCalls.filter((src) => src.includes('episode-05-supplier-management')).length
  )).toBe(2);
  expect(await page.evaluate(() => window.__audioInstances.filter((audio) => audio !== window.__sharedAudio).length)).toBe(0);
  await expect(page.locator('#toast-region .toast', { hasText: "Episode audio isn't loading" })).toHaveCount(0);
  await expect(page.locator('#toast-region .toast', { hasText: 'Audio failed for a line' })).toHaveCount(0);
});

test('auto-advance follows the playing show while another show is being browsed', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('speedByShow', JSON.stringify({
      'ap-finance-mastery': 1.3,
      'claude-code-mastery': 2.2
    }));
  });
  await installControlledAudio(page);
  await openApEpisode(page, 5);
  await page.locator('#play-btn').click();
  await expect(page.locator('#play-btn')).toHaveAttribute('aria-label', 'Pause');
  await expect.poll(() => page.evaluate(() => window.__sharedAudio.playbackRate)).toBe(1.3);

  await page.locator('#back-to-list').click();
  await page.locator('#back-to-podcasts').click();
  await page.locator('.podcast-card:has-text("Claude Code Mastery")').first().click();
  await expect(page.locator('#current-podcast-title')).toContainText('Claude Code Mastery');
  await expect(page.locator('#mini-player-title')).toContainText('Supplier Management & Spend Analytics');
  // Browsing Claude must not apply Claude's 2.2x preference to AP playback.
  await expect.poll(() => page.evaluate(() => window.__sharedAudio.playbackRate)).toBe(1.3);

  await page.evaluate(() => window.__sharedAudio.finish());
  await expect(page.locator('#complete-message')).toContainText('Compliance, Fraud Prevention & Internal Controls');

  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('tlu_podcast_state') || '{}'));
  expect(saved.completedEpisodes).toContain('ap-finance-mastery-5');
  expect(saved.completedEpisodes).not.toContain('claude-code-mastery-5');
  expect(saved.episodeProgress['ap-finance-mastery-5']).toBeTruthy();
  expect(saved.episodeProgress['claude-code-mastery-5']).toBeUndefined();

  await page.locator('#play-next-episode').click();
  await expect(page.locator('#player-episode-title')).toContainText('Compliance, Fraud Prevention & Internal Controls');
  await expect(page.locator('#np-show-name')).toContainText('AP & Finance Mastery · Episode 6');
});
