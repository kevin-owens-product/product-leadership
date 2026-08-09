import { test, expect } from '@playwright/test';

// This regression exercises catalog content and local bookmark state. Keeping
// the service worker out of the path ensures a stale cached catalog cannot
// mask a missing chapter during the test.
test.use({ serviceWorkers: 'block' });

async function openFirstApEpisode(page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => {});

  const podcastCard = page.locator('.podcast-card:has-text("AP & Finance Mastery")').first();
  await expect(podcastCard).toBeVisible();
  await podcastCard.click();
  await expect(page.locator('#list-view')).toHaveClass(/active/);

  const episodeCard = page.locator('.episode-card:has-text("AP Fundamentals & The Invoice Lifecycle")').first();
  await expect(episodeCard).toBeVisible();
  await episodeCard.click();
  await expect(page.locator('#player-view')).toHaveClass(/active/);
}

test('AP Finance exposes chapters and supports creating a bookmark', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(String(error)));
  await page.setViewportSize({ width: 375, height: 667 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openFirstApEpisode(page);

  const chapterItems = page.locator('#chapters-list .chapter-item');
  await expect(chapterItems).toHaveCount(11);
  await expect(chapterItems.first()).toContainText('Introduction');
  await expect(page.locator('#current-chapter-badge')).toContainText('Chapter 1: Introduction');

  // On compact phones the tab strip begins below the first viewport. The
  // always-visible bookmark shortcut must select and reveal it.
  await page.locator('#np-bookmark-btn').click();
  await expect(page.locator('#tab-bookmarks')).toHaveClass(/active/);
  await expect(page.locator('#bookmarks-list')).toHaveClass(/active/);
  await expect.poll(() => page.locator('.nav-panel').evaluate((panel) => {
    const bounds = panel.getBoundingClientRect();
    return bounds.top >= 0 && bounds.top < window.innerHeight;
  })).toBe(true);

  await page.locator('#add-bookmark-btn').click();
  await expect(page.locator('#bookmark-modal')).toHaveClass(/show/);
  await page.locator('#bookmark-note-input').fill('AP regression note');
  await page.locator('#save-bookmark').click();

  await expect(page.locator('#bookmark-modal')).not.toHaveClass(/show/);
  await expect(page.locator('#bookmarks-list .bookmark-item')).toContainText('AP regression note');

  // Bookmark state is podcast-and-episode scoped and must survive reopening.
  await openFirstApEpisode(page);
  await page.locator('#np-bookmark-btn').click();
  await expect(page.locator('#bookmarks-list .bookmark-item')).toContainText('AP regression note');
  expect(pageErrors).toEqual([]);
});
