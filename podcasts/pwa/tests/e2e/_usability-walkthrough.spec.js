import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const OUT = '/tmp/pwa-usability-test';
fs.mkdirSync(OUT, { recursive: true });
const obs = [];
const log = (k, v) => obs.push({ k, v });
test.afterAll(async () => {
  fs.writeFileSync(path.join(OUT, 'observations.json'), JSON.stringify(obs, null, 2));
});

// ---------- Desktop pass ----------
test.describe('desktop walkthrough', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('home → podcast → episode → player flow', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});

    await page.screenshot({ path: path.join(OUT, '01-home-desktop.png'), fullPage: true });

    const podcastCount = await page.locator('.podcast-card').count();
    const addPodcastCount = await page.locator('.add-podcast-card').count();
    const versionText = await page.locator('#version-badge').textContent();
    log('home', { podcastCards: podcastCount, addPodcastCards: addPodcastCount, version: versionText });

    // search behavior
    await page.fill('#podcast-search', 'zzzzz-no-match');
    await page.waitForTimeout(300);
    const noMatchHtml = await page.locator('#podcasts-list').innerHTML();
    log('home.search.noMatch', { len: noMatchHtml.length, preview: noMatchHtml.slice(0, 400) });
    await page.screenshot({ path: path.join(OUT, '02-home-search-no-match.png'), fullPage: true });
    await page.fill('#podcast-search', '');

    // tap into a podcast
    const firstPodcast = page.locator('.podcast-card').first();
    const firstPodcastText = (await firstPodcast.textContent()) || '';
    log('home.firstPodcast', { text: firstPodcastText.replace(/\s+/g, ' ').trim().slice(0, 200) });
    await firstPodcast.click();
    await expect(page.locator('#list-view')).toHaveClass(/active/);
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT, '03-episode-list.png'), fullPage: true });

    // episode list stats
    const epCount = await page.locator('.episode-card').count();
    log('episodeList', { episodeCount: epCount });

    // filter buttons
    for (const filter of ['unplayed', 'in-progress', 'completed', 'all']) {
      await page.locator(`.filter-btn[data-filter="${filter}"]`).click();
      await page.waitForTimeout(200);
      const visible = await page.locator('.episode-card').count();
      log(`episodeList.filter.${filter}`, { visible });
    }
    await page.screenshot({ path: path.join(OUT, '04-episode-list-filters.png'), fullPage: true });

    // open an episode
    const ep = page.locator('.episode-card').first();
    await ep.click();
    await expect(page.locator('#player-view')).toHaveClass(/active/);
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(OUT, '05-player.png'), fullPage: true });

    const playerInfo = await page.evaluate(() => {
      const titleEl = document.getElementById('player-episode-title');
      const breadcrumb = document.getElementById('player-breadcrumb');
      const transcriptLines = document.querySelectorAll('#transcript-content .transcript-line').length;
      const chapters = document.querySelectorAll('#chapters-list .chapter-item').length;
      return {
        title: titleEl?.textContent?.trim(),
        breadcrumb: breadcrumb?.textContent?.trim(),
        transcriptLines,
        chapters,
      };
    });
    log('player', playerInfo);

    // Settings panel (inside the ⋯ options sheet since the D3 redesign)
    await page.locator('#player-more-btn').click();
    await page.locator('#settings-panel .panel-header').click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT, '06-settings-open.png'), fullPage: true });
    await page.locator('#close-player-more').click();
    await page.waitForTimeout(200);

    // modals
    await page.locator('#sleep-timer-btn').click();
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(OUT, '07-sleep-timer-modal.png'), fullPage: true });
    await page.locator('#close-sleep-modal').click();

    // Stats lives in the ⋯ options sheet; opening it closes the sheet.
    await page.locator('#player-more-btn').click();
    await page.locator('#stats-btn').click();
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(OUT, '08-stats-modal.png'), fullPage: true });
    await page.locator('#close-stats-modal').click();

    await page.locator('#share-btn').click();
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(OUT, '09-share-modal.png'), fullPage: true });
    await page.locator('#close-share-modal').click();

    // Bookmark modal — regression check: clicking Add Bookmark must open the modal.
    await page.locator('.nav-tab[data-tab="bookmarks"]').click();
    await page.waitForTimeout(200);
    const before = await page.evaluate(() => getComputedStyle(document.getElementById('bookmark-modal')).display);
    await page.locator('#add-bookmark-btn').click();
    await page.waitForTimeout(300);
    const after = await page.evaluate(() => getComputedStyle(document.getElementById('bookmark-modal')).display);
    log('bookmark.addBtn.opens', { before, after, opens: after !== 'none' });
    await page.screenshot({ path: path.join(OUT, '10-bookmark-modal.png'), fullPage: true });
    await page.locator('#cancel-bookmark').click();
    await page.waitForTimeout(200);

    // Speed popover — open it, pick the 1.5x preset, then dismiss.
    await page.locator('#speed-btn').click();
    await page.locator('.speed-preset-btn[data-speed="1.5"]').click();
    await page.waitForTimeout(200);
    const speedVal = await page.locator('#speed-value').textContent();
    log('player.speed1.5', { speedValue: speedVal });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);

    // Light theme (theme toggle sits in the settings accordion inside the
    // ⋯ options sheet; the accordion is still expanded from earlier).
    await page.locator('#player-more-btn').click();
    await page.locator('#theme-toggle').click();
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(OUT, '11-player-light-theme.png'), fullPage: true });
    // back to dark, then dismiss the sheet
    await page.locator('#theme-toggle').click();
    await page.locator('#close-player-more').click();
    await page.waitForTimeout(200);

    // Navigate back via header back
    await page.locator('#back-to-list').click();
    await expect(page.locator('#list-view')).toHaveClass(/active/);
    await page.locator('#back-to-podcasts').click();
    await expect(page.locator('#podcasts-view')).toHaveClass(/active/);

    log('errors', errors);
  });
});

// ---------- Mobile pass ----------
test.describe('mobile walkthrough', () => {
  test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });

  test('home and player on iPhone-sized viewport', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.screenshot({ path: path.join(OUT, 'mobile-01-home.png'), fullPage: true });

    await page.locator('.podcast-card').first().click();
    await expect(page.locator('#list-view')).toHaveClass(/active/);
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT, 'mobile-02-episodes.png'), fullPage: true });

    await page.locator('.episode-card').first().click();
    await expect(page.locator('#player-view')).toHaveClass(/active/);
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(OUT, 'mobile-03-player-top.png'), fullPage: true });

    // capture above-the-fold (no fullPage) to see what fits on screen
    await page.screenshot({ path: path.join(OUT, 'mobile-04-player-fold.png'), fullPage: false });

    // Header-row button widths to assess touch targets
    const headerBtns = await page.evaluate(() => {
      const els = document.querySelectorAll('#player-view .player-header .header-btn');
      return Array.from(els).map((e) => {
        const r = e.getBoundingClientRect();
        return { id: e.id, w: Math.round(r.width), h: Math.round(r.height) };
      });
    });
    log('mobile.headerBtns', headerBtns);

    const speedPresets = await page.evaluate(() => {
      const els = document.querySelectorAll('.speed-preset-btn');
      return Array.from(els).map((e) => {
        const r = e.getBoundingClientRect();
        return { label: e.textContent?.trim(), w: Math.round(r.width), h: Math.round(r.height) };
      });
    });
    log('mobile.speedPresets', speedPresets);

    const navTabs = await page.evaluate(() => {
      const els = document.querySelectorAll('.nav-tab');
      return Array.from(els).map((e) => {
        const r = e.getBoundingClientRect();
        return { label: e.textContent?.trim(), w: Math.round(r.width), h: Math.round(r.height) };
      });
    });
    log('mobile.navTabs', navTabs);

    // Does the player header fit one row?
    const overflow = await page.evaluate(() => {
      const h = document.querySelector('#player-view .player-header');
      const r = h.getBoundingClientRect();
      return { headerWidth: Math.round(r.width), scrollWidth: h.scrollWidth, overflows: h.scrollWidth > Math.ceil(r.width) };
    });
    log('mobile.headerOverflow', overflow);

    // Episode title truncation
    const epTitleInfo = await page.evaluate(() => {
      const t = document.getElementById('player-episode-title');
      return { text: t.textContent, scrollWidth: t.scrollWidth, clientWidth: t.clientWidth, truncated: t.scrollWidth > t.clientWidth };
    });
    log('mobile.episodeTitle', epTitleInfo);
  });
});

// ---------- Accessibility-ish snapshot ----------
test('a11y/aria audit (light pass)', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.locator('.podcast-card').first().click();
  await page.locator('.episode-card').first().click();
  await page.waitForTimeout(400);

  const audit = await page.evaluate(() => {
    const out = {};
    // 1. buttons without accessible name
    const unnamed = [];
    document.querySelectorAll('button').forEach((b) => {
      const name = (b.getAttribute('aria-label') || b.textContent || '').trim();
      if (!name) unnamed.push({ id: b.id, class: b.className });
    });
    out.unnamedButtons = unnamed;

    // 2. inputs without labels
    const unlabeled = [];
    document.querySelectorAll('input,select,textarea').forEach((el) => {
      const lbl = el.getAttribute('aria-label') || el.getAttribute('placeholder');
      const wrappedLabel = el.closest('label');
      if (!lbl && !wrappedLabel) unlabeled.push({ id: el.id, type: el.type, name: el.name });
    });
    out.unlabeledInputs = unlabeled;

    // 3. heading order
    const headings = [];
    document.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach((h) => {
      const v = h.closest('.view');
      const visible = v ? v.classList.contains('active') : true;
      headings.push({ tag: h.tagName, text: (h.textContent || '').trim().slice(0, 60), inActiveView: visible });
    });
    out.headings = headings;

    // 4. emoji-only buttons (icon without text fallback besides aria-label)
    const emojiBtns = [];
    document.querySelectorAll('button').forEach((b) => {
      const txt = (b.textContent || '').trim();
      if (txt && txt.length <= 3 && /\p{Extended_Pictographic}|[←↑↓↻↺⏮⏭▶⏸×]/u.test(txt)) {
        emojiBtns.push({ id: b.id, label: b.getAttribute('aria-label'), txt });
      }
    });
    out.iconOnlyButtons = emojiBtns;

    // 5. tabindex/role on card "buttons"
    const cards = [];
    document.querySelectorAll('.podcast-card, .episode-card, .add-podcast-card').forEach((c) => {
      cards.push({ class: c.className, role: c.getAttribute('role'), tabindex: c.getAttribute('tabindex') });
    });
    out.cards = cards;

    // 6. nav-tab role
    const tabs = [];
    document.querySelectorAll('.nav-tab').forEach((t) => {
      tabs.push({ text: t.textContent.trim(), role: t.getAttribute('role'), ariaSelected: t.getAttribute('aria-selected') });
    });
    out.navTabs = tabs;

    // 7. focus visibility — check that buttons aren't outline:none w/o focus-visible style
    out.outlineRule = !!document.querySelector('style, link[rel=stylesheet]');

    // 8. live region for status text?
    const statusText = document.getElementById('status-text');
    out.statusRegion = { ariaLive: statusText?.getAttribute('aria-live'), role: statusText?.getAttribute('role') };

    // 9. modal a11y
    const modals = [];
    document.querySelectorAll('.modal-overlay').forEach((m) => {
      modals.push({ id: m.id, role: m.getAttribute('role'), ariaModal: m.getAttribute('aria-modal'), ariaLabel: m.getAttribute('aria-label'), ariaLabelledby: m.getAttribute('aria-labelledby') });
    });
    out.modals = modals;

    return out;
  });

  log('a11y', audit);
});
