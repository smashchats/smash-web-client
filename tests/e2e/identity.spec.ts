import { test, expect } from './fixtures/users';
import { completeOnboarding } from './fixtures/users';

test.describe('Identity Creation Flow', () => {
  test('should complete onboarding and create identity', async ({ alice }) => {
    const { page } = alice;
    
    console.log('🧪 Testing identity creation flow...');
    
    // Start at root - should redirect to welcome if no identity
    await page.goto('/');
    
    // Should automatically redirect to welcome page
    await expect(page).toHaveURL('/welcome');
    
    // Verify welcome screen is visible
    await expect(page.getByText('Smashchats')).toBeVisible();
    await expect(page.getByTestId('welcome-get-started')).toBeVisible();
    
    // Complete the onboarding flow
    await completeOnboarding(page, 'Alice');
    
    // Verify we land on the chats screen
    await expect(page).toHaveURL('/chats');
    
    // Verify navigation is available (mobile or desktop)
    const isMobile = await page.locator('[data-testid="bottom-nav"]').isVisible();
    const isDesktop = await page.locator('[data-testid="side-nav"]').isVisible();
    
    expect(isMobile || isDesktop).toBe(true);
    
    // Verify we can navigate to different sections
    if (isMobile) {
      await expect(page.getByTestId('nav-chats')).toBeVisible();
      await expect(page.getByTestId('nav-camera')).toBeVisible();
      await expect(page.getByTestId('nav-gallery')).toBeVisible();
    } else {
      await expect(page.getByTestId('side-nav-chats')).toBeVisible();
      await expect(page.getByTestId('side-nav-camera')).toBeVisible();
      await expect(page.getByTestId('side-nav-gallery')).toBeVisible();
      await expect(page.getByTestId('side-nav-settings')).toBeVisible();
    }
    
    console.log('✅ Identity creation flow completed successfully');
  });

  test('should persist identity across browser sessions', async ({ alice }) => {
    const { page } = alice;
    
    console.log('🧪 Testing identity persistence...');
    
    // Complete onboarding first
    await page.goto('/');
    await expect(page).toHaveURL('/welcome');
    await completeOnboarding(page, 'Alice Persistent');
    
    // Verify we're on chats page
    await expect(page).toHaveURL('/chats');
    
    // Reload the page to simulate browser restart
    await page.reload();
    
    // Should still be on chats page (not redirected to welcome)
    await expect(page).toHaveURL('/chats');
    
    // Navigation should still be available
    const isMobile = await page.locator('[data-testid="bottom-nav"]').isVisible();
    const isDesktop = await page.locator('[data-testid="side-nav"]').isVisible();
    
    expect(isMobile || isDesktop).toBe(true);
    
    console.log('✅ Identity persistence verified');
  });

  test('should handle invalid display names gracefully', async ({ alice }) => {
    const { page } = alice;
    
    console.log('🧪 Testing display name validation...');
    
    await page.goto('/welcome');
    await page.getByTestId('welcome-get-started').click();
    
    // Try with empty name
    await page.getByTestId('welcome-create-identity').click();
    
    // Should show validation error or be disabled
    const createButton = page.getByTestId('welcome-create-identity');
    const isDisabled = await createButton.isDisabled();
    
    // Either button is disabled or we get an error message
    if (!isDisabled) {
      // Wait for potential error message
      await expect(page.locator('.welcome-error')).toBeVisible({ timeout: 3000 });
    }
    
    // Now try with a valid name
    await page.getByTestId('welcome-display-name-input').fill('Valid Name');
    await page.getByTestId('welcome-create-identity').click();
    
    // Should complete successfully
    await expect(page).toHaveURL('/chats');
    
    console.log('✅ Display name validation works correctly');
  });
});