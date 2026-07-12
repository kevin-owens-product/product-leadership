#!/usr/bin/env node
// D5 extra fixtures: longest episode title in the player, and the
// longest show list (The Forge Podcast, 16 eps, warm hue — worst-case
// adaptive contrast). Writes to design-shots/final/extra/.
import { chromium } from '../node_modules/playwright/index.mjs';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.argv[2] || 4519);
const OUT = path.join(ROOT, 'design-shots/final/extra');
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio'] });
const context = await browser.newContext({
  viewport: { width: 393, height: 852 }, deviceScaleFactor: 2,
  isMobile: true, hasTouch: true, serviceWorkers: 'block', colorScheme: 'dark'
});
const page = await context.newPage();

async function shoot(name, settle = 350) {
  await page.waitForTimeout(settle);
  await page.screenshot({ path: path.join(OUT, `${name}.png`) });
  console.log(`  ✓ extra/${name}.png`);
}

await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'domcontentloaded' });
await page.locator('.podcast-card').first().waitFor({ state: 'visible' });

// 1. Longest show list — The Forge Podcast (16 episodes, warm hue)
await page.locator('.podcast-card:has-text("The Forge Podcast")').first().click();
await page.locator('#list-view.active').waitFor();
await page.locator('.episode-card').first().waitFor({ state: 'visible' });
await shoot('forge-list-warm-hue');

// 2. Longest episode title in the player
await page.goBack().catch(() => {});
await page.locator('.podcast-card').first().waitFor({ state: 'visible' }).catch(async () => {
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'domcontentloaded' });
  await page.locator('.podcast-card').first().waitFor({ state: 'visible' });
});
await page.locator('.podcast-card:has-text("Agentic Coding Frontier")').first().click();
await page.locator('#list-view.active').waitFor();
await page.locator('.episode-card:has-text("Frontier Trends and the New Engineering Operating Model")').first().click();
await page.locator('#player-view.active').waitFor();
await page.evaluate(() => window.scrollTo(0, 0));
await shoot('player-longest-title');

await browser.close();
