#!/usr/bin/env node
// Motion probe — captures MID-transition frames so the D4 choreography can
// be judged with eyes, not hope: card→header morph, header→hero morph,
// mini-player expand, sheet slide-up, staggered list entrance.
//
// Usage: node tools/motion-probe.mjs [--out design-shots/d4-motion] [--port 4519]
//                                    [--reduced-motion]

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
const OUT = path.resolve(ROOT, argValue('--out', 'design-shots/d4-motion'));
const PORT = Number(argValue('--port', '4519'));
const REDUCED = args.includes('--reduced-motion');

const SHOW = 'Agentic Coding Frontier';
const EPISODE = 'Agentic Coding Foundations';

async function serverUp(port) {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/index.html`, { signal: AbortSignal.timeout(1000) });
    return res.ok;
  } catch { return false; }
}

async function startServer(port) {
  if (await serverUp(port)) return null;
  if (!existsSync(path.join(DIST, 'index.html'))) {
    console.error('dist/index.html missing — run `node build-episodes.js` first.');
    process.exit(1);
  }
  const bin = path.join(ROOT, 'node_modules', '.bin', 'http-server');
  const proc = spawn(bin, [DIST, '-p', String(port), '-c-1', '--silent'], { stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    if (await serverUp(port)) return proc;
    await new Promise(r => setTimeout(r, 100));
  }
  proc.kill();
  throw new Error(`dist server did not come up on :${port}`);
}

// Fire `trigger` then rip N frames as fast as playwright allows.
async function burst(page, trigger, name, frames = 5, gap = 55) {
  await trigger();
  for (let i = 0; i < frames; i++) {
    await page.screenshot({ path: path.join(OUT, `${name}-f${i}.png`) });
    await page.waitForTimeout(gap);
  }
  console.log(`  ✓ ${name}-f0..f${frames - 1}`);
}

await mkdir(OUT, { recursive: true });
const server = await startServer(PORT);
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio'] });
const context = await browser.newContext({
  viewport: { width: 393, height: 852 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  reducedMotion: REDUCED ? 'reduce' : 'no-preference',
  serviceWorkers: 'block',
  colorScheme: 'dark'
});
const page = await context.newPage();

try {
  // 0. Staggered home entrance: reload and shoot immediately.
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'domcontentloaded' });
  await page.locator('.podcast-card').first().waitFor({ state: 'visible', timeout: 15000 });

  // 1. Card → show-header artwork morph.
  await burst(page, () => page.locator(`.podcast-card:has-text("${SHOW}")`).first().click(), '01-card-to-header');
  await page.locator('#list-view.active').waitFor();

  // 1b. Episode-list staggered entrance is part of the same burst above.

  // 2. Header → hero artwork morph (opening the episode).
  await page.locator('.episode-card').first().waitFor({ state: 'visible' });
  await burst(page, () => page.locator(`.episode-card:has-text("${EPISODE}")`).first().click(), '02-header-to-hero');
  await page.locator('#player-view.active').waitFor();
  await page.locator('.transcript-line').first().waitFor({ state: 'visible' });

  // 3. Sheet physics: the ⋯ options sheet sliding up.
  await burst(page, () => page.locator('#player-more-btn').click(), '03-sheet-up', 4, 60);
  await page.locator('#close-player-more').click();
  await page.waitForTimeout(300);

  // 4. Hero → header morph (back to list), then mini-player expand.
  await page.locator('#play-btn').click();
  await page.locator('#play-btn.playing').waitFor({ timeout: 5000 });
  await page.waitForTimeout(400);
  await burst(page, () => page.locator('#back-to-list').click(), '04-hero-to-header');
  await page.locator('#mini-player.active').waitFor();
  await page.waitForTimeout(400);

  // 5. Mini-player expand landing on the hero.
  await burst(page, () => page.locator('#mini-player-open').click(), '05-mini-expand', 6, 55);
  await page.locator('#player-view.active').waitFor();

  // 6. Scrubber thumb spring: press-and-hold on the progress bar.
  await page.evaluate(() => window.scrollTo(0, 0));
  const bar = page.locator('#progress-bar');
  const box = await bar.boundingBox();
  await page.mouse.move(box.x + box.width * 0.4, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(90);
  await page.screenshot({ path: path.join(OUT, '06-scrub-grab-mid.png') });
  await page.waitForTimeout(260);
  await page.screenshot({ path: path.join(OUT, '06-scrub-grab-settled.png') });
  await page.mouse.up();
  console.log('  ✓ 06-scrub-grab');

  console.log(`\nDone → ${OUT}`);
} finally {
  await browser.close();
  if (server) server.kill();
}
