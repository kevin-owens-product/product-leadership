import { test, expect } from '@playwright/test';

// Reopening an episode with saved progress should auto-resume to the saved line,
// not start at line 0. The resume banner is a confirmation, not a prompt.

test('reopening an episode auto-resumes from saved line', async ({ page }) => {
  // Seed progress directly into localStorage so we don't depend on real playback.
  await page.addInitScript(() => {
    const state = {
      schemaVersion: 1,
      episodeProgress: {
        'agentic-coding-frontier-1': { line: 42, percent: 43, timestamp: Date.now() },
      },
      completedEpisodes: [],
      bookmarks: {},
      speechRate: 1,
      autoPlayNext: true,
    };
    localStorage.setItem('tlu_podcast_state', JSON.stringify(state));
  });

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => {});

  await page.locator('.podcast-card:has-text("Agentic Coding Frontier")').first().click();
  await page.locator('.episode-card').first().click();
  await expect(page.locator('#player-view')).toHaveClass(/active/);

  // The transcript line marked as "current" is index 42 (line 43 / 1-indexed),
  // not index 0. This is what tells the user "you'll resume here when you press play".
  const lines = page.locator('.transcript-line');
  await expect(lines.nth(42)).toHaveClass(/\bcurrent\b/);
  await expect(lines.first()).not.toHaveClass(/\bcurrent\b/);

  // The banner should show the resumed-at copy, not the old prompt.
  const banner = page.locator('#resume-banner');
  await expect(banner).toBeVisible();
  await expect(banner).toContainText('Resumed where you left off');
  await expect(banner).toContainText('43%');
  // The old "Resume" button should be gone — banner is informational now.
  await expect(page.locator('#resume-banner-resume')).toHaveCount(0);

  // "Start from beginning" should jump back to line 0 and hide the banner.
  await page.locator('#resume-banner-start').click();
  await expect(lines.first()).toHaveClass(/\bcurrent\b/);
  await expect(banner).toBeHidden();
});

test('completed episode does not show the resume banner', async ({ page }) => {
  await page.addInitScript(() => {
    const state = {
      schemaVersion: 1,
      episodeProgress: {
        // savedLine at the final index — treat as completed, no resume.
        'agentic-coding-frontier-1': { line: 999, percent: 100, timestamp: Date.now() },
      },
      completedEpisodes: ['agentic-coding-frontier-1'],
      bookmarks: {},
      speechRate: 1,
      autoPlayNext: true,
    };
    localStorage.setItem('tlu_podcast_state', JSON.stringify(state));
  });

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.locator('.podcast-card:has-text("Agentic Coding Frontier")').first().click();
  await page.locator('.episode-card').first().click();
  await expect(page.locator('#player-view')).toHaveClass(/active/);

  await expect(page.locator('#resume-banner')).toBeHidden();
});
