import { expect, test } from '@playwright/test';

test.describe('Identity Management', () => {
    test.beforeEach(async ({ page, context }) => {
        console.log('--------------------------------');
        console.log('Starting test');
        console.log('--------------------------------');

        // Grant clipboard permissions
        await context.grantPermissions(['clipboard-read', 'clipboard-write']);

        await page.goto('/');

        // Listen to console messages
        page.on('console', (msg) => {
            console.log(`Browser console [${msg.type()}]:`, msg.text());
            if (msg.type() === 'error') {
                console.error('Browser error:', msg.text());
            }
        });
    });

    test('should generate a new peer identity', async ({ page }) => {
        // Get the generate identity button
        const generateButton = page.locator('button.button--primary');

        // Click the button and wait for loading state
        await generateButton.click();
        await expect(generateButton).toHaveAttribute('data-loading', 'true');

        // Check for any error messages in the toast
        const errorToast = page.locator('.toast-viewport [role="alert"]');
        const hasError = await errorToast.isVisible();
        if (hasError) {
            console.log('Error toast found:', await errorToast.textContent());
        }

        // Wait for app container to appear after identity generation
        await page
            .locator('.app-container')
            .waitFor({ state: 'visible', timeout: 30000 });

        // Should transition to main app view with sidebar
        const sidebar = page.locator('nav.sidebar');
        await expect(sidebar).toBeVisible();

        // Verify settings icon is visible in the sidebar (third button with settings icon)
        const settingsButton = sidebar.locator('button.sidebar-button').nth(2);
        await expect(settingsButton).toBeVisible();
        await expect(settingsButton.locator('.lucide-settings')).toBeVisible();

        // Verify we're in the empty chat state
        await expect(
            page.getByText('Select a chat to start messaging'),
        ).toBeVisible();
    });

    test('should copy DID document from settings', async ({ page }) => {
        // Get the generate identity button
        const generateButton = page.locator('button.button--primary');

        // Click the button and wait for loading state
        await generateButton.click();
        await expect(generateButton).toHaveAttribute('data-loading', 'true');

        // Check for any error messages in the toast
        const errorToast = page.locator('.toast-viewport [role="alert"]');
        const hasError = await errorToast.isVisible();
        if (hasError) {
            console.log('Error toast found:', await errorToast.textContent());
        }

        // Wait for app container to appear after identity generation
        await page
            .locator('.app-container')
            .waitFor({ state: 'visible', timeout: 30000 });

        // Should transition to main app view with sidebar
        const sidebar = page.locator('nav.sidebar');
        await expect(sidebar).toBeVisible();

        // Click settings (third button with settings icon)
        const settingsButton = sidebar.locator('button.sidebar-button').nth(2);
        await expect(settingsButton).toBeVisible();
        await expect(settingsButton.locator('.lucide-settings')).toBeVisible();
        await settingsButton.click();

        // Verify we're in settings
        await expect(
            page.getByRole('heading', { name: /your identity/i }),
        ).toBeVisible();

        // Click copy DID document button
        const copyButton = page.getByRole('button', {
            name: /copy did document/i,
        });
        await expect(copyButton).toBeVisible();
        await copyButton.click();

        // Verify success state
        await expect(page.getByText(/copied!/i)).toBeVisible();

        // Get clipboard content and verify it's a valid DID document
        const clipboardContent = await page.evaluate(async () => {
            try {
                return await navigator.clipboard.readText();
            } catch (error) {
                console.error('Failed to read clipboard:', error);
                return null;
            }
        });

        if (!clipboardContent) {
            throw new Error('Failed to read clipboard content');
        }

        const didDoc = JSON.parse(clipboardContent);

        // Verify DID document structure
        expect(didDoc).toHaveProperty('id');
        expect(didDoc.id).toMatch(/^did:/);
        expect(didDoc).toHaveProperty('ik');
        expect(didDoc).toHaveProperty('ek');
        expect(didDoc).toHaveProperty('signature');
        expect(didDoc).toHaveProperty('endpoints');
        expect(Array.isArray(didDoc.endpoints)).toBe(true);
    });

    test('should persist identity across page reloads', async ({ page }) => {
        // Get the generate identity button
        const generateButton = page.locator('button.button--primary');

        // Click the button and wait for loading state
        await generateButton.click();
        await expect(generateButton).toHaveAttribute('data-loading', 'true');

        // Check for any error messages in the toast
        const errorToast = page.locator('.toast-viewport [role="alert"]');
        const hasError = await errorToast.isVisible();
        if (hasError) {
            console.log('Error toast found:', await errorToast.textContent());
        }

        // Wait for app container to appear after identity generation
        await page
            .locator('.app-container')
            .waitFor({ state: 'visible', timeout: 30000 });

        // Should transition to main app view with sidebar
        const sidebar = page.locator('nav.sidebar');
        await expect(sidebar).toBeVisible();

        // Click settings (third button with settings icon)
        const settingsButton = sidebar.locator('button.sidebar-button').nth(2);
        await expect(settingsButton).toBeVisible();
        await expect(settingsButton.locator('.lucide-settings')).toBeVisible();
        await settingsButton.click();

        // Verify we're in settings
        await expect(
            page.getByRole('heading', { name: /your identity/i }),
        ).toBeVisible();

        // Get original DID
        const copyButton = page.getByRole('button', {
            name: /copy did document/i,
        });
        await expect(copyButton).toBeVisible();
        await copyButton.click();

        // Verify success state
        await expect(page.getByText(/copied!/i)).toBeVisible();

        // Get original DID from clipboard
        const originalClipboardContent = await page.evaluate(async () => {
            try {
                return await navigator.clipboard.readText();
            } catch (error) {
                console.error('Failed to read clipboard:', error);
                return null;
            }
        });

        if (!originalClipboardContent) {
            throw new Error('Failed to read original DID from clipboard');
        }

        const originalDid = JSON.parse(originalClipboardContent).id;

        // Reload the page
        await page.reload();

        // Wait for app container and sidebar again after reload
        await page
            .locator('.app-container')
            .waitFor({ state: 'visible', timeout: 30000 });
        await expect(sidebar).toBeVisible();

        // Go back to settings
        await settingsButton.click();
        await expect(
            page.getByRole('heading', { name: /your identity/i }),
        ).toBeVisible();

        // Copy DID document again
        await copyButton.click();
        await expect(page.getByText(/copied!/i)).toBeVisible();

        // Get reloaded DID from clipboard
        const reloadedClipboardContent = await page.evaluate(async () => {
            try {
                return await navigator.clipboard.readText();
            } catch (error) {
                console.error('Failed to read clipboard:', error);
                return null;
            }
        });

        if (!reloadedClipboardContent) {
            throw new Error('Failed to read reloaded DID from clipboard');
        }

        const reloadedDid = JSON.parse(reloadedClipboardContent).id;
        expect(reloadedDid).toBe(originalDid);
    });
});
