import { test, expect } from '@playwright/test';

test.describe('Basic Setup', () => {
  test('should load the application', async ({ page }) => {
    console.log('🧪 Testing basic application loading...');
    
    // Just try to load the page
    await page.goto('/');
    
    // Should have the app title
    await expect(page).toHaveTitle(/Smashchats/);
    
    console.log('✅ Application loads successfully');
  });
});