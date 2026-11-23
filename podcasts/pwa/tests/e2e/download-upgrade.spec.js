import { test as base, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { once } from 'node:events';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import httpServer from 'http-server';

const app = fileURLToPath(new URL('../../', import.meta.url));
const shipped = {
  '2.7.1': '6d2114f5898c07874fea7a8fe9f20686aa8d1135',
  '2.7.2': '496b9f91300ed4fe4d55bc5a02078f96ac44ab66',
  '2.7.3': 'b96ac4603c962758475e8339c241ca9fd6151ca1'
};
const episode = 'claude-code-mastery/episode-01-getting-started';
const revisedEpisode = 'agentic-coding-frontier/episode-07-the-model-map-autumn-2026';
const offlineCache = 'podlearn-offline-audio-v1';

// Materialize the actual previously shipped worker, shell and one episode.
// A shallow checkout can supply the same unpacked release via
// PODLEARN_PREVIOUS_DIST. No checkout or rebuild is needed for either side.
async function previousRelease(temp, version) {
  if (process.env.PODLEARN_PREVIOUS_DIST) return path.resolve(process.env.PODLEARN_PREVIOUS_DIST);
  const previous = path.join(temp, 'previous');
  await fs.mkdir(previous);
  function extract(commit, files) {
    const archive = execFileSync('git', ['archive', '--format=tar', commit + ':podcasts/pwa/dist', '--', ...files],
      { cwd: path.resolve(app, '../..'), maxBuffer: 32 * 1024 * 1024 });
    execFileSync('tar', ['-xf', '-', '-C', previous], { input: archive });
  }
  const target = version === '2.7.3' ? revisedEpisode : episode;
  extract(shipped[version], [
    'sw.js', 'version.json', 'index.html', 'manifest.json', 'podcasts.js', 'icon*', 'covers', 'src', 'styles',
    `transcripts/${target}.md`
  ]);
  // 2.7.3 could store its current script alongside a recording saved before
  // the episode was lengthened. Recreate that exact on-device combination.
  const recording = version === '2.7.3' ? 'a565b7d8fa99153c6e4608bb326929eb1b493f70' : shipped[version];
  extract(recording, [`audio/${target}/combined.mp3`, `audio/${target}/manifest.json`]);
  return previous;
}

// Switch the origin atomically while keeping the tabs, worker registration,
// and Cache Storage alive, just as a deploy at the same URL would.
const test = base.extend({
  baseline: ['2.7.1', { option: true }],
  site: async ({ baseline }, use) => {
    const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'podlearn-upgrade-'));
    const live = path.join(temp, 'live');
    const current = process.env.PODLEARN_TARGET_DIST ? path.resolve(process.env.PODLEARN_TARGET_DIST) : path.join(app, 'dist');
    const server = httpServer.createServer({ root: live, cache: -1, showDir: false }).server;
    let published = false;
    let newAudioRequests = 0;
    server.prependListener('request', (req) => {
      if (published && req.url.split('?')[0].endsWith('/combined.mp3')) newAudioRequests++;
    });
    async function disconnect() {
      if (!server.listening) return;
      const closed = once(server, 'close');
      server.close();
      server.closeAllConnections();
      await closed;
    }
    try {
      const previous = await previousRelease(temp, baseline);
      await fs.symlink(previous, live, 'dir');
      const oldVersion = JSON.parse(await fs.readFile(path.join(previous, 'version.json'), 'utf8')).buildVersion;
      const newVersion = JSON.parse(await fs.readFile(path.join(current, 'version.json'), 'utf8')).buildVersion;
      expect(oldVersion.split('+')[0]).toBe(baseline);
      expect(newVersion).not.toBe(oldVersion);
      server.listen(0, '127.0.0.1');
      await once(server, 'listening');
      await use({
        origin: `http://127.0.0.1:${server.address().port}`,
        oldVersion, newVersion,
        async publish() {
          const next = path.join(temp, 'next');
          await fs.symlink(current, next, 'dir');
          await fs.rename(next, live);
          published = true;
        },
        newAudioRequests: () => newAudioRequests,
        disconnect
      });
    } finally {
      await disconnect();
      await fs.rm(temp, { recursive: true, force: true });
    }
  }
});

const cachedEpisodeUrls = page => page.evaluate(async name => {
  const cache = await caches.open(name);
  return (await cache.keys()).map(request => request.url).sort();
}, offlineCache);

test.describe('previously downloaded short cut of Agentic Coding Frontier episode 7', () => {
  test.use({ baseline: '2.7.3' });

  for (const missing of [false, true]) {
    test(`plays online and offline after upgrade with a ${missing ? 'missing' : 'mismatched'} saved script`, async ({ site, page, context }) => {
      await page.goto(site.origin);
      await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
      await page.locator('.podcast-card[data-podcast-id="agentic-coding-frontier"]').click();
      await page.locator('.season-tab[data-season="2"]').click();
      const download = page.locator('.episode-card[data-episode-id="7"] .ep-download-btn');
      await download.click();
      await expect(download).toHaveClass(/downloaded/);
      if (missing) {
        await page.evaluate(async name => {
          const cache = await caches.open(name);
          const script = (await cache.keys()).find(request => request.url.includes('/transcripts/'));
          await cache.delete(script);
        }, offlineCache);
      }
      await page.locator('#back-to-podcasts').click();
      await page.waitForFunction(() => !history.state?.['podlearn-back']);
      await site.publish();
      await page.locator('#refresh-btn').click();
      await expect(page.locator('#version-badge')).toHaveAttribute('title', 'v' + site.newVersion);
      await page.goto(site.origin);

      async function playSavedCut(tab) {
        const downloads = tab.locator('#home-downloads summary');
        await expect(downloads).toHaveText('Downloads (1)');
        await downloads.click();
        await tab.locator('#downloads-list').getByRole('button', { name: /^Play / }).click();
        await expect(tab.locator('.transcript-line')).toHaveCount(78);
        await expect(tab.locator('#play-btn')).toHaveAttribute('aria-label', 'Pause');
        await expect(tab.locator('#current-pos')).toHaveText(/^0:0[1-9]$/);
      }
      await playSavedCut(page);
      await page.close();
      expect(site.newAudioRequests()).toBe(0);
      await site.disconnect();
      await context.setOffline(true);
      const offline = await context.newPage();
      await offline.goto(site.origin);
      await playSavedCut(offline);
    });
  }
});

for (const [baseline, action] of [['2.7.1', 'Refresh'], ['2.7.1', 'Update Now'], ['2.7.2', 'Refresh']]) {
  test.describe(`${baseline} via ${action}`, () => {
    test.use({ baseline });

    test('a saved episode survives the upgrade, a pinned tab, and an offline launch', async ({ page, context, site }) => {
      test.setTimeout(60000);
      await page.goto(site.origin);
      const badge = page.locator('#version-badge');
      await expect(badge).toHaveAttribute('title', 'v' + site.oldVersion);
      await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
      await page.locator('.podcast-card[data-podcast-id="claude-code-mastery"]').click();
      const download = page.locator('.episode-card[data-episode-id="1"] .ep-download-btn');
      await download.click();
      await expect(download).toHaveClass(/downloaded/);
      const original = await cachedEpisodeUrls(page);
      expect(original).toHaveLength(3);

      const pinned = await context.newPage();
      if (baseline === '2.7.2') {
        await pinned.addInitScript(() => {
          const NativeAudio = window.Audio;
          window.Audio = function (...args) {
            const element = new NativeAudio(...args);
            window.pinnedAudio ??= element;
            return element;
          };
        });
        await pinned.goto(site.origin + '/?podcast=claude-code-mastery&episode=1');
        await expect(pinned.locator('#player-view')).toHaveClass(/active/);
        await pinned.waitForFunction(() => window.pinnedAudio?.readyState >= 1);
      } else {
        await pinned.goto(site.origin);
      }
      await expect(pinned.locator('#version-badge')).toHaveAttribute('title', 'v' + site.oldVersion);
      await page.locator('#back-to-podcasts').click();
      await expect(page.locator('#refresh-btn')).toBeVisible();
      await page.waitForFunction(() => !history.state?.['podlearn-back']);
      await site.publish();

      if (action === 'Refresh') {
        await page.locator('#refresh-btn').click();
      } else {
        // The old worker still serves its cached shell on this visit. The old
        // page checks the *new* network version and discovers a waiting worker.
        await page.reload({ waitUntil: 'domcontentloaded' });
        await expect(page.locator('#apply-update-btn')).toBeVisible();
        await expect(badge).toHaveAttribute('title', 'v' + site.oldVersion);
        expect(await cachedEpisodeUrls(page)).toEqual(original);
        await page.locator('#apply-update-btn').click();
      }

      await expect(badge).toHaveAttribute('title', 'v' + site.newVersion);
      await expect(page.locator('#home-downloads summary')).toHaveText('Downloads (1)');
      expect(await page.evaluate(() => caches.keys())).not.toContain('podlearn-shell-' + site.oldVersion);
      expect(await cachedEpisodeUrls(page)).toEqual(original);

      // The other open tab can keep its old UI until it chooses the update.
      await expect(pinned.locator('#version-badge')).toHaveAttribute('title', 'v' + site.oldVersion);
      if (baseline === '2.7.2') {
        // The old player's combined-audio recovery path asks its current worker
        // to evict the playing MP3 in isolation. A newer worker now controls it.
        const result = await pinned.evaluate(() => new Promise(resolve => {
          const channel = new MessageChannel();
          channel.port1.onmessage = event => { channel.port1.close(); resolve(event.data); };
          const url = window.pinnedAudio.currentSrc || window.pinnedAudio.src;
          navigator.serviceWorker.controller.postMessage({ type: 'DELETE_AUDIO_URLS', urls: [url] }, [channel.port2]);
        }));
        expect(result.type).toBe('DELETE_AUDIO_URLS_RESULT');
        expect(await cachedEpisodeUrls(pinned), 'legacy playback recovery must preserve the downloaded MP3').toEqual(original);
        await pinned.locator('#toast-region').getByRole('button', { name: 'Update', exact: true }).click();
      } else {
        await pinned.locator('#apply-update-btn').click();
      }
      await expect(pinned.locator('#version-badge')).toHaveAttribute('title', 'v' + site.newVersion);
      await pinned.close();
      await page.close();

      // The origin must be unreachable to worker-initiated requests as well as
      // page requests. A new context client can trigger independent SW fetches.
      expect(site.newAudioRequests()).toBe(0);
      await site.disconnect();
      await context.setOffline(true);
      const offline = await context.newPage();
      await offline.goto(site.origin, { waitUntil: 'domcontentloaded' });
      const downloads = offline.locator('#home-downloads summary');
      await expect(downloads).toHaveText('Downloads (1)');
      await downloads.click();
      await offline.getByRole('button', { name: /Play Getting Started with Claude Code/ }).click();
      await expect(offline.locator('#play-btn')).toHaveAttribute('aria-label', 'Pause');
      await expect(offline.locator('#current-pos')).toHaveText(/^0:0[1-9]$/);
    });
  });
}
