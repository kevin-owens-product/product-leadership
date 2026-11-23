import { test, expect } from '@playwright/test';

test.use({ serviceWorkers: 'block' });

async function openShow(page, showId) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.locator(`.podcast-card[data-podcast-id="${showId}"]`).click();
  await expect(page.locator('#list-view')).toHaveClass(/active/);
}

async function visibleEpisodeIds(page) {
  return page.locator('.episode-card').evaluateAll((cards) =>
    cards.map((card) => Number(card.dataset.episodeId))
  );
}

for (const show of [
  { id: 'operator-mode', seasonOne: [1, 8], seasonTwo: [9, 16], count: 8 }
]) {
  test(`${show.id} renders and remembers explicit seasons`, async ({ page }) => {
    await openShow(page, show.id);
    await expect(page.locator(`.podcast-card[data-podcast-id="${show.id}"]`)).toContainText('2 seasons');
    await expect(page.locator('#season-deck')).toBeVisible();
    await expect(page.getByRole('tab', { name: /Season 1:/ })).toHaveAttribute('aria-selected', 'true');
    let ids = await visibleEpisodeIds(page);
    expect(ids).toHaveLength(show.count);
    expect(ids[0]).toBe(show.seasonOne[0]);
    expect(ids.at(-1)).toBe(show.seasonOne[1]);

    await page.locator('.season-tab[data-season="2"]').click();
    await expect(page.locator('.season-tab[data-season="2"]')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('.season-tab[data-season="2"]')).toBeFocused();
    ids = await visibleEpisodeIds(page);
    expect(ids).toHaveLength(show.count);
    expect(ids[0]).toBe(show.seasonTwo[0]);
    expect(ids.at(-1)).toBe(show.seasonTwo[1]);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('#list-view')).toHaveClass(/active/);
    await expect(page.locator('.season-tab[data-season="2"]')).toHaveAttribute('aria-selected', 'true');
  });
}

test('single-season shows keep the flat list without season chrome', async ({ page }) => {
  await openShow(page, 'the-forge-podcast');
  await expect(page.locator('#season-deck')).toBeHidden();
  await expect(page.locator('#season-nav')).toBeHidden();
  await expect(page.locator('.episode-card')).toHaveCount(16);
  await expect(page.locator('.podcast-card[data-podcast-id="the-forge-podcast"]')).not.toContainText('seasons');
});

test('deep-linked episode wins and Back returns to its season', async ({ page }) => {
  await page.goto('/?podcast=operator-mode&episode=16&season=1', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#player-view')).toHaveClass(/active/);
  await expect(page.locator('#player-episode-title')).toHaveText('Admit the Thesis Broke');
  await page.locator('#back-to-list').click();
  await expect(page.locator('.season-tab[data-season="2"]')).toHaveAttribute('aria-selected', 'true');
  const ids = await visibleEpisodeIds(page);
  expect(ids[0]).toBe(9);
  expect(ids.at(-1)).toBe(16);
});

test('Start Season plays the selected episode', async ({ page }) => {
  await openShow(page, 'operator-mode');
  const start = page.locator('#continue-episode');
  await expect(start).toContainText('Start Season 1');
  await start.click();
  await expect(page.locator('#play-btn')).toHaveAttribute('aria-label', 'Pause');
});

test('season-only deep link opens the requested season list', async ({ page }) => {
  await page.goto('/?podcast=operator-mode&season=2', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#list-view')).toHaveClass(/active/);
  await expect(page.locator('.season-tab[data-season="2"]')).toHaveAttribute('aria-selected', 'true');
  expect(await visibleEpisodeIds(page)).toEqual([9, 10, 11, 12, 13, 14, 15, 16]);
  await page.locator('.season-tab[data-season="1"]').click();
  await expect(page).toHaveURL(/podcast=operator-mode.*season=1/);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('.season-tab[data-season="1"]')).toHaveAttribute('aria-selected', 'true');
});

test('completing Season 1 selects Season 2 and offers the next listening action', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('tlu_podcast_state', JSON.stringify({
      schemaVersion: 3,
      completedEpisodes: Array.from({ length: 8 }, (_, index) => `operator-mode-${index + 1}`),
      episodeProgress: {},
      bookmarks: {},
      seasonSelections: {}
    }));
  });
  await openShow(page, 'operator-mode');
  await expect(page.locator('.season-tab[data-season="2"]')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#continue-episode')).toHaveAttribute('data-episode-id', '9');
  await expect(page.locator('#continue-episode-label')).toHaveText('Start Season 2');
});

test('a fully played show reports series completion', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('tlu_podcast_state', JSON.stringify({
      schemaVersion: 3,
      completedEpisodes: Array.from({ length: 16 }, (_, index) => `operator-mode-${index + 1}`),
      episodeProgress: {},
      bookmarks: {},
      seasonSelections: { 'operator-mode': 2 }
    }));
  });
  await openShow(page, 'operator-mode');
  await expect(page.locator('#continue-episode-label')).toHaveText('Series complete');
  await expect(page.locator('#continue-episode-title')).toHaveText('All episodes played');
});

test('season search offers a deliberate all-season escape', async ({ page }) => {
  await openShow(page, 'operator-mode');
  await page.locator('#episode-search').fill('Admit the Thesis Broke');
  await expect(page.locator('.episode-card')).toHaveCount(0);
  await expect(page.locator('#search-all-seasons')).toContainText('1 more');
  await page.locator('#search-all-seasons').click();
  await expect(page.locator('.episode-card')).toHaveCount(1);
  await expect(page.locator('.episode-card')).toHaveAttribute('data-episode-id', '16');
  await expect(page.locator('.season-search-scope')).toContainText('all 2 seasons');
  await expect(page.locator('.filter-btn[data-filter="all"]')).toHaveText('All 1');
});

test('season search exposes later-season matches even when the active season also matches', async ({ page }) => {
  await openShow(page, 'operator-mode');
  await page.locator('#episode-search').fill('run');
  const selectedCount = await page.locator('.episode-card').count();
  expect(selectedCount).toBeGreaterThan(0);
  await expect(page.locator('#search-all-seasons')).toContainText(/more across all seasons/);
  await page.locator('#search-all-seasons').click();
  expect(await page.locator('.episode-card').count()).toBeGreaterThan(selectedCount);
  await page.locator('#episode-search').fill('build');
  await expect(page.locator('.season-search-scope')).toContainText('all 2 seasons');
});

test('season search and status filter render one scoped cross-season escape', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('tlu_podcast_state', JSON.stringify({
      schemaVersion: 3,
      completedEpisodes: ['operator-mode-15'],
      episodeProgress: {},
      bookmarks: {},
      seasonSelections: {}
    }));
  });
  await openShow(page, 'operator-mode');
  await page.locator('#episode-search').fill('build');
  await page.locator('.filter-btn[data-filter="completed"]').click();
  await expect(page.locator('#search-all-seasons')).toHaveCount(1);
  await expect(page.locator('.filter-btn[data-filter="completed"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#search-all-seasons').click();
  await expect(page.locator('#search-all-seasons')).toHaveCount(0);
  await expect(page.locator('.episode-card')).toHaveCount(1);
  await page.locator('#episode-search').fill('no such operator episode');
  await expect(page.locator('#episode-list .no-items')).toContainText('across all 2 seasons');
});

test('season navigation composes with sorting and keyboard controls', async ({ page }) => {
  await openShow(page, 'operator-mode');
  const seasonOne = page.locator('.season-tab[data-season="1"]');
  await seasonOne.focus();
  await page.keyboard.press('ArrowRight');
  const seasonTwo = page.locator('.season-tab[data-season="2"]');
  await expect(seasonTwo).toBeFocused();
  await expect(seasonTwo).toHaveAttribute('aria-selected', 'true');
  await seasonOne.focus();
  await page.keyboard.press('Enter');
  await expect(seasonOne).toBeFocused();
  await expect(seasonOne).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('ArrowRight');
  await page.locator('#episode-sort').selectOption('newest');
  expect((await visibleEpisodeIds(page))[0]).toBe(16);
});

test('mobile season controls are reachable, sticky, and do not overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openShow(page, 'agentic-coding-frontier');
  const nav = page.locator('#season-nav');
  const seasonTwo = page.locator('.season-tab[data-season="2"]');
  const initial = await seasonTwo.boundingBox();
  expect(initial).not.toBeNull();
  expect(initial.height).toBeGreaterThanOrEqual(44);
  expect(initial.y).toBeLessThan(844);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  const topScroll = await page.evaluate(() => window.scrollY);
  // Dispatch without Playwright's locator auto-scroll so this assertion covers
  // the app's season activation behavior rather than test-runner positioning.
  await seasonTwo.evaluate((button) => button.click());
  await expect(seasonTwo).toBeFocused();
  await expect(page.locator('#season-deck')).toBeInViewport();
  expect(await page.evaluate(() => window.scrollY)).toBe(topScroll);

  await page.evaluate(() => window.scrollTo(0, 1300));
  await expect.poll(() => nav.evaluate((element) => Math.round(element.getBoundingClientRect().top))).toBe(0);
  await page.locator('.season-tab[data-season="1"]').click();
  expect((await visibleEpisodeIds(page))[0]).toBe(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
