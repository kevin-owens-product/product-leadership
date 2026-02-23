import { test, expect } from '@playwright/test';

test('loads home and can open player shell', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#podcasts-view')).toBeVisible();

  const firstCard = page.locator('.podcast-card').first();
  await expect(firstCard).toBeVisible();
  await firstCard.click();

  await expect(page.locator('#list-view')).toHaveClass(/active/);

  const firstEpisode = page.locator('.episode-card').first();
  await firstEpisode.click();

  await expect(page.locator('#player-view')).toHaveClass(/active/);
  await expect(page.locator('#play-btn')).toBeVisible();
});

test('transcript search handles regex-like input without crash', async ({ page }) => {
  await page.goto('/');
  await page.locator('.podcast-card').first().click();
  await page.locator('.episode-card').first().click();

  await page.fill('#transcript-search-input', 'a+b?(c)[d]');
  await expect(page.locator('#transcript-search-input')).toHaveValue('a+b?(c)[d]');
});
