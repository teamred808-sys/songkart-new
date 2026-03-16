import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('Login with valid credentials', async ({ page }) => {
    page.on('pageerror', error => {
      console.error(`Page Error: ${error.message}`);
    });
    
    await page.goto('/');
    
    // Ensure the page has loaded
    await page.waitForLoadState('networkidle');
    
    // Find and click the "Sign In" button in navigation
    const signInButton = page.locator('text=Sign In').first();
    await signInButton.waitFor({ state: 'visible' });
    await signInButton.click();
    
    // Wait for URL to change to /auth
    await expect(page).toHaveURL(/.*auth/);
    
    // Fill out the form
    await page.fill('input[type="email"]', 'teamred808@gmail.com');
    await page.fill('input[type="password"]', 'Rathee@1');
    
    // Click submit
    // In shadcn, it might be a button with text "Sign in" or similar inside the form
    await page.locator('button[type="submit"]').click();
    
    // Wait for navigation after successful login
    // Depending on role, it goes to /admin, /seller/dashboard, or /buyer/dashboard
    await page.waitForURL(/.*(dashboard|admin|\/$)/, { timeout: 10000 });
    
    // Verify session in localStorage
    const token = await page.evaluate(() => localStorage.getItem('auth_token'));
    expect(token).toBeTruthy();
  });
});
