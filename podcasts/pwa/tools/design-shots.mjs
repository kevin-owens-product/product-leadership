#!/usr/bin/env node
// Design screenshot harness — drives a fixed tour of the app and writes
// PNGs for visual review. Never style blind: run this after every
// meaningful CSS/markup change and LOOK at the output.
//
// Usage:
//   node tools/design-shots.mjs [--out design-shots/current] [--port 4519]
//                               [--reduced-motion] [--only <state,...>]
//
// Tour states (both viewports):
//   home, show-list, player, transcript, speed-popover, sleep-modal,
//   queue, mini-player, error-toast
//
// Serves dist/ itself (python3 http.server) unless something already
// answers on the chosen port. Requires a fresh `node build-episodes.js`.

import { chromium } from '../node_modules/playwright/index.mjs';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');

const args = process.argv.slice(2);
function argValue(flag, fallback) {
  const i = args.indexOf(flag);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
}
const OUT = path.resolve(ROOT, argValue('--out', 'design-shots/current'));
const PORT = Number(argValue('--port', '4519'));
const REDUCED_MOTION = args.includes('--reduced-motion');
const ONLY = argValue('--only', '').split(',').filter(Boolean);

const VIEWPORTS = [
  { name: 'mobile', width: 393, height: 852, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  { name: 'desktop', width: 1280, height: 800, deviceScaleFactor: 1, isMobile: false, hasTouch: false }
];

// Tour show/episode: picked because its audio manifest matches every
// dialogue line (98/98) and ships per-line durations + combined.mp3, so
// the app enters continuous playback mode — a real, stable mid-playback
// state with no error-skipping.
const SHOW = 'Agentic Coding Frontier';
const EPISODE = 'Agentic Coding Foundations';

async function serverUp(port) {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/index.html`, { signal: AbortSignal.timeout(1000) });
    return res.ok;
  } catch {
    return false;
  }
}

async function startServer(port) {
  if (await serverUp(port)) return null; // reuse an existing server
  if (!existsSync(path.join(DIST, 'index.html'))) {
    console.error('dist/index.html missing — run `node build-episodes.js` first.');
    process.exit(1);
  }
  // http-server (devDependency, same as playwright.config.js) rather than
  // python3 -m http.server: seeking the combined.mp3 needs Range support.
  const bin = path.join(ROOT, 'node_modules', '.bin', 'http-server');
  const proc = spawn(bin, [DIST, '-p', String(port), '-c-1', '--silent'], {
    stdio: 'ignore',
    detached: false
  });
  for (let i = 0; i < 50; i++) {
    if (await serverUp(port)) return proc;
    await new Promise(r => setTimeout(r, 100));
  }
  proc.kill();
  throw new Error(`dist server did not come up on :${port}`);
}

async function gotoHome(page) {
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'domcontentloaded' });
  await page.locator('.podcast-card').first().waitFor({ state: 'visible', timeout: 15000 });
}

async function openShowList(page) {
  await gotoHome(page);
  await page.locator(`.podcast-card:has-text("${SHOW}")`).first().click();
  await page.locator('#list-view.active').waitFor();
  await page.locator('.episode-card').first().waitFor({ state: 'visible' });
}

async function openPlayer(page) {
  await openShowList(page);
  await page.locator(`.episode-card:has-text("${EPISODE}")`).first().click();
  await page.locator('#player-view.active').waitFor();
  await page.locator('.transcript-line').first().waitFor({ state: 'visible' });
}

function wantsState(name) {
  return ONLY.length === 0 || ONLY.includes(name);
}

async function shoot(page, vp, name, { settle = 250 } = {}) {
  const dir = path.join(OUT, vp.name);
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, `${name}.png`);
  await page.waitForTimeout(settle); // settle animations
  await page.screenshot({ path: file });
  console.log(`  ✓ ${vp.name}/${name}.png`);
}

// Close stray toasts (e.g. codec hiccups in headless) so tour shots stay
// clean; the dedicated error-toast state shoots its own toast.
async function dismissToasts(page) {
  const closes = page.locator('#toast-region .toast-close');
  while (await closes.count()) {
    await closes.first().click().catch(() => {});
    await page.waitForTimeout(80);
  }
}

async function runTour(browser, vp) {
  console.log(`\n[${vp.name}] ${vp.width}x${vp.height}`);
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: vp.deviceScaleFactor,
    isMobile: vp.isMobile,
    hasTouch: vp.hasTouch,
    reducedMotion: REDUCED_MOTION ? 'reduce' : 'no-preference',
    serviceWorkers: 'block',
    colorScheme: 'dark'
  });
  const page = await context.newPage();

  // 1. Home
  if (wantsState('home')) {
    await gotoHome(page);
    await shoot(page, vp, '01-home');
  }

  // 2. Show (episode) list
  if (wantsState('show-list')) {
    await openShowList(page);
    await shoot(page, vp, '02-show-list');
  }

  // 3–7 share a player session.
  const needsPlayer = ['player', 'transcript', 'speed-popover', 'sleep-modal', 'queue']
    .some(wantsState);
  if (needsPlayer) {
    await openPlayer(page);

    // 3. Player mid-playback: start playback from the play button (a real
    //    user gesture, so autoplay policy is satisfied), then seek into
    //    chapter 3 for a believable mid-episode progress state.
    await page.locator('#play-btn').click();
    await page.locator('#play-btn.playing').waitFor({ timeout: 5000 });
    await page.locator('.chapter-item').nth(2).click();
    // Wait for the seek to land (clock jumps past the chapter start).
    await page.waitForFunction(() => {
      const t = document.getElementById('current-pos')?.textContent || '';
      const parts = t.split(':').map(Number);
      const secs = parts.length === 3
        ? parts[0] * 3600 + parts[1] * 60 + parts[2]
        : (parts[0] || 0) * 60 + (parts[1] || 0);
      return secs > 120;
    }, { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(600);
    if (wantsState('player')) {
      await dismissToasts(page);
      await page.evaluate(() => window.scrollTo(0, 0));
      await shoot(page, vp, '03-player', { settle: 80 });
    }

    // 4. Transcript in view
    if (wantsState('transcript')) {
      await dismissToasts(page);
      await page.locator('#transcript-panel').scrollIntoViewIfNeeded();
      await shoot(page, vp, '04-transcript', { settle: 80 });
      await page.evaluate(() => window.scrollTo(0, 0));
    }

    // 5. Speed popover
    if (wantsState('speed-popover')) {
      await dismissToasts(page);
      await page.locator('#speed-btn').scrollIntoViewIfNeeded();
      await page.locator('#speed-btn').click();
      await page.locator('#speed-popover').waitFor({ state: 'visible' });
      await shoot(page, vp, '05-speed-popover');
      await page.keyboard.press('Escape');
    }

    // 6. Sleep modal (with an active countdown so state is visible)
    if (wantsState('sleep-modal')) {
      await dismissToasts(page);
      await page.locator('#sleep-timer-btn').click();
      await page.locator('#sleep-modal.show').waitFor();
      await page.locator('.timer-btn[data-minutes="15"]').click();
      await shoot(page, vp, '06-sleep-modal');
      await page.locator('#cancel-timer').click();
      await page.locator('#close-sleep-modal').click();
    }

    // 7. Queue tab
    if (wantsState('queue')) {
      await dismissToasts(page);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.locator('#tab-queue').click();
      await shoot(page, vp, '07-queue', { settle: 80 });
      await page.locator('#tab-chapters').click();
    }

    // 8. Mini player over the episode list (playback continues)
    if (wantsState('mini-player')) {
      await page.locator('#back-to-list').click();
      await page.locator('#mini-player.active').waitFor();
      await dismissToasts(page);
      // Let the view transition crossfade finish before shooting.
      await shoot(page, vp, '08-mini-player', { settle: 450 });
    }
  } else if (wantsState('mini-player')) {
    await openPlayer(page);
    await page.locator('#play-btn').click();
    await page.waitForTimeout(600);
    await page.locator('#back-to-list').click();
    await page.locator('#mini-player.active').waitFor();
    await shoot(page, vp, '08-mini-player');
  }

  await context.close();

  // 9. Error toast — fresh context so route aborts can force a download
  //    failure without polluting the main tour.
  if (wantsState('error-toast')) {
    const errContext = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: vp.deviceScaleFactor,
      isMobile: vp.isMobile,
      hasTouch: vp.hasTouch,
      reducedMotion: REDUCED_MOTION ? 'reduce' : 'no-preference',
      serviceWorkers: 'block',
      colorScheme: 'dark'
    });
    const errPage = await errContext.newPage();
    await errPage.route('**/audio/**/manifest.json*', route => route.abort());
    await gotoHome(errPage);
    await errPage.locator(`.podcast-card:has-text("${SHOW}")`).first().click();
    await errPage.locator('#list-view.active').waitFor();
    await errPage.locator('.episode-card .ep-download-btn').first().click();
    await errPage.locator('#toast-region .toast').waitFor({ state: 'visible' });
    await shoot(errPage, vp, '09-error-toast');
    await errContext.close();
  }
}

const server = await startServer(PORT);
const browser = await chromium.launch({
  args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio']
});
try {
  for (const vp of VIEWPORTS) {
    await runTour(browser, vp);
  }
  console.log(`\nDone → ${OUT}`);
} finally {
  await browser.close();
  if (server) server.kill();
}
