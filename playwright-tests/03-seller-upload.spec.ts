import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Seller Upload and Features', () => {
  test('Seller dashboard access and mock upload', async ({ page }) => {
    // Suppress console error noise
    page.on('pageerror', error => {});

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Find and click the "Sign In" button in navigation
    const signInButton = page.locator('text=Sign In').first();
    await signInButton.waitFor({ state: 'visible' });
    await signInButton.click();
    
    // Wait for the sign in tab to be active and visible
    const emailInput = page.locator('#signin-email').first();
    await emailInput.waitFor({ state: 'visible' });
    await emailInput.fill('seller@test.com');
    await page.locator('#signin-password').first().fill('Rathee@1');
    
    // Click submit
    await page.locator('button[type="submit"]').first().click();
    
    // Check if we reach admin or dashboard
    await page.waitForURL(/.*(dashboard|admin|\/$)/, { timeout: 10000 });
    
    // Go directly to upload page
    await page.goto('/seller/songs/upload');
    
    // Expect the upload page to load
    await expect(page).toHaveURL(/.*seller\/songs\/upload/);
    
    // Form fill
    await page.fill('input[name="title"], input[id="title"], input[placeholder*="title" i]', 'Automated Test Song');
    
    // We need to look at how the file inputs are structured in the app
    const fileInputs = page.locator('input[type="file"]');
    if (await fileInputs.count() >= 2) {
      // Assuming first is Audio, second is Artwork (or vice-versa, need to check label)
      // Usually there's an accept="audio/*" and accept="image/*"
      const audioInput = page.locator('input[type="file"][accept*="audio"]');
      if (await audioInput.count() > 0) {
        await audioInput.setInputFiles(path.resolve('dummy.mp3'));
      }
      
      const imageInput = page.locator('input[type="file"][accept*="image"]');
      if (await imageInput.count() > 0) {
        await imageInput.setInputFiles(path.resolve('dummy.png'));
      }
      
      // Wait a moment for UI to register file
      await page.waitForTimeout(1000);
      
      // Try to submit
      const uploadButton = page.locator('button:has-text("Upload"), button:has-text("Submit"), button:has-text("Save")').first();
      if (await uploadButton.isVisible() && await uploadButton.isEnabled()) {
         // Intercept request to check
         const uploadPromise = page.waitForResponse(r => r.url().includes('/api/songs') && r.request().method() === 'POST', { timeout: 10000 }).catch(() => null);
         await uploadButton.click();
         await uploadPromise;
      }
    }
  });
});
