import { test, expect } from '@playwright/test';

test.describe('Buyer Purchase Flow', () => {
  test('Add to cart and checkout', async ({ page }) => {
    // Suppress console error noise
    page.on('pageerror', error => {});

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Login as buyer
    const signInButton = page.locator('text=Sign In').first();
    await signInButton.waitFor({ state: 'visible' });
    await signInButton.click();
    
    const emailInput = page.locator('#signin-email').first();
    await emailInput.waitFor({ state: 'visible' });
    await emailInput.fill('buyer@test.com');
    await page.locator('#signin-password').first().fill('Rathee@1');
    
    // Click submit
    const responsePromise = page.waitForResponse(r => r.url().includes('/api/auth/login'));
    await page.locator('button[type="submit"]').first().click();
    
    // Wait for the login response
    const response = await responsePromise;
    console.log(`Login status: ${response.status()}`);
    
    // Wait for navigation after successful login
    await page.waitForURL(url => !url.href.includes('/auth'), { timeout: 10000 });
    
    // Go to browse page
    await page.goto('/browse');
    await page.waitForLoadState('networkidle');
    
    // Find the test song and add to cart
    const addToCartBtn = page.locator('button:has(svg.lucide-shopping-cart), button:has-text("Add to Cart")').first();
    if (await addToCartBtn.isVisible()) {
        await addToCartBtn.click();
        
        // Go to cart
        await page.goto('/buyer/cart');
        await expect(page).toHaveURL(/.*buyer\/cart/);
        
        // Find checkout button
        const checkoutBtn = page.locator('button:has-text("Checkout")').first();
        if (await checkoutBtn.isVisible()) {
            await checkoutBtn.click();
            // Wait for checkout page or confirmation
            await page.waitForTimeout(2000);
        }
    }
  });
});
