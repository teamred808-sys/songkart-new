import { test, expect } from '@playwright/test';

test.describe('Navigation and Browsing Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Intercept and ignore audio playback errors since we might not have real audio
    page.on('pageerror', error => {
      if (!error.message.includes('play() failed')) {
        console.error(`Page Error: ${error.message}`);
      }
    });
  });

  test('Public Navigation', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check header links
    const browseLink = page.locator('a:has-text("Browse")').filter({ hasText: /^Browse$/ }).first();
    await browseLink.waitFor({ state: 'visible' });
    await browseLink.click();
    await expect(page).toHaveURL(/.*browse/);
    
    // Test Search input
    const searchInput = page.locator('input[placeholder*="Search"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('Test Song');
      await searchInput.press('Enter');
      await page.waitForTimeout(1000);
    }

    // Click on the first song if available
    const songCard = page.locator('.song-card, [data-testid="song-card"], a[href*="/song/"]').first();
    if (await songCard.isVisible()) {
      await songCard.click();
      await expect(page).toHaveURL(/.*song\//);
      
      // Check play button
      const playButton = page.locator('button:has(svg.lucide-play), button:has(svg.lucide-pause), [aria-label="Play"]').first();
      if (await playButton.isVisible()) {
        await playButton.click();
        await page.waitForTimeout(500); // let player initialize
      }
    }
  });
});
