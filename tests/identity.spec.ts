import { expect, test } from '@playwright/test';

test.describe('Identity Management', () => {
    test.beforeEach(async ({ page, context }) => {
        console.log('--------------------------------');
        console.log('Starting test');
        console.log('--------------------------------');

        console.log('Granting clipboard permissions');
        await context.grantPermissions(['clipboard-read', 'clipboard-write']);

        console.log('Navigating to home page');
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
        console.log('Testing peer identity generation');

        // Get the generate identity button
        const generateButton = page.locator('button.button--primary');

        console.log('Clicking generate identity button');
        await generateButton.click();
        await expect(generateButton).toHaveAttribute('data-loading', 'true');

        // Check for any error messages in the toast
        const errorToast = page.locator('.toast-viewport [role="alert"]');
        const hasError = await errorToast.isVisible();
        if (hasError) {
            console.log('Error toast found:', await errorToast.textContent());
        }

        console.log('Waiting for app container');
        await page
            .locator('.app-container')
            .waitFor({ state: 'visible', timeout: 30000 });

        console.log('Verifying sidebar and settings');
        const sidebar = page.locator('nav.sidebar');
        await expect(sidebar).toBeVisible();

        const settingsButton = sidebar.locator('button.sidebar-button').nth(2);
        await expect(settingsButton).toBeVisible();
        await expect(settingsButton.locator('.lucide-settings')).toBeVisible();

        console.log('Verifying empty chat state');
        await expect(
            page.getByText('Select a chat to start messaging'),
        ).toBeVisible();
    });

    test('should copy DID document from settings', async ({ page }) => {
        console.log('Testing DID document copy functionality');

        console.log('Generating identity');
        const generateButton = page.locator('button.button--primary');
        await generateButton.click();
        await expect(generateButton).toHaveAttribute('data-loading', 'true');

        // Check for any error messages in the toast
        const errorToast = page.locator('.toast-viewport [role="alert"]');
        const hasError = await errorToast.isVisible();
        if (hasError) {
            console.log('Error toast found:', await errorToast.textContent());
        }

        console.log('Waiting for app container');
        await page
            .locator('.app-container')
            .waitFor({ state: 'visible', timeout: 30000 });

        const sidebar = page.locator('nav.sidebar');
        await expect(sidebar).toBeVisible();

        console.log('Navigating to settings');
        const settingsButton = sidebar.locator('button.sidebar-button').nth(2);
        await expect(settingsButton).toBeVisible();
        await expect(settingsButton.locator('.lucide-settings')).toBeVisible();
        await settingsButton.click();

        await expect(
            page.getByRole('heading', { name: /your identity/i }),
        ).toBeVisible();

        console.log('Copying DID document');
        const copyButton = page.getByRole('button', {
            name: /copy did document/i,
        });
        await expect(copyButton).toBeVisible();
        await copyButton.click();

        await expect(page.getByText(/copied!/i)).toBeVisible();

        console.log('Verifying clipboard content');
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

        console.log('Validating DID document structure');
        expect(didDoc).toHaveProperty('id');
        expect(didDoc.id).toMatch(/^did:/);
        expect(didDoc).toHaveProperty('ik');
        expect(didDoc).toHaveProperty('ek');
        expect(didDoc).toHaveProperty('signature');
        expect(didDoc).toHaveProperty('endpoints');
        expect(Array.isArray(didDoc.endpoints)).toBe(true);
    });

    test('should persist identity across page reloads', async ({ page }) => {
        console.log('Testing identity persistence');

        console.log('Generating initial identity');
        const generateButton = page.locator('button.button--primary');
        await generateButton.click();
        await expect(generateButton).toHaveAttribute('data-loading', 'true');

        // Check for any error messages in the toast
        const errorToast = page.locator('.toast-viewport [role="alert"]');
        const hasError = await errorToast.isVisible();
        if (hasError) {
            console.log('Error toast found:', await errorToast.textContent());
        }

        console.log('Waiting for app container');
        await page
            .locator('.app-container')
            .waitFor({ state: 'visible', timeout: 30000 });

        const sidebar = page.locator('nav.sidebar');
        await expect(sidebar).toBeVisible();

        console.log('Navigating to settings');
        const settingsButton = sidebar.locator('button.sidebar-button').nth(2);
        await expect(settingsButton).toBeVisible();
        await expect(settingsButton.locator('.lucide-settings')).toBeVisible();
        await settingsButton.click();

        await expect(
            page.getByRole('heading', { name: /your identity/i }),
        ).toBeVisible();

        console.log('Getting original DID');
        const copyButton = page.getByRole('button', {
            name: /copy did document/i,
        });
        await expect(copyButton).toBeVisible();
        await copyButton.click();

        await expect(page.getByText(/copied!/i)).toBeVisible();

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

        console.log('Reloading page');
        await page.reload();

        console.log('Waiting for app container after reload');
        await page
            .locator('.app-container')
            .waitFor({ state: 'visible', timeout: 30000 });
        await expect(sidebar).toBeVisible();

        console.log('Verifying DID persistence');
        await settingsButton.click();
        await expect(
            page.getByRole('heading', { name: /your identity/i }),
        ).toBeVisible();

        await copyButton.click();
        await expect(page.getByText(/copied!/i)).toBeVisible();

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

    test('should change SME configuration and connect to new server', async ({
        page,
    }) => {
        console.log('Testing SME configuration change');

        console.log('Generating identity');
        const generateButton = page.locator('button.button--primary');
        await generateButton.click();
        await expect(generateButton).toHaveAttribute('data-loading', 'true');

        // Check for any error messages in the toast
        const errorToast = page.locator('.toast-viewport [role="alert"]');
        const hasError = await errorToast.isVisible();
        if (hasError) {
            console.log('Error toast found:', await errorToast.textContent());
        }

        console.log('Waiting for app container');
        await page
            .locator('.app-container')
            .waitFor({ state: 'visible', timeout: 30000 });

        const sidebar = page.locator('nav.sidebar');
        await expect(sidebar).toBeVisible();

        console.log('Navigating to settings');
        const settingsButton = sidebar.locator('button.sidebar-button').nth(2);
        await expect(settingsButton).toBeVisible();
        await expect(settingsButton.locator('.lucide-settings')).toBeVisible();
        await settingsButton.click();

        await expect(
            page.getByRole('heading', { name: /your identity/i }),
        ).toBeVisible();

        console.log('Configuring SME settings');
        await expect(
            page.getByRole('heading', { name: /sme configuration/i }),
        ).toBeVisible();

        const smeUrlInput = page.locator('input[placeholder="Enter SME URL"]');
        await expect(smeUrlInput).toBeVisible();
        await smeUrlInput.fill('ws://localhost:12345/secondary');

        const smePublicKeyInput = page.locator(
            'input[placeholder="Enter SME public key"]',
        );
        await expect(smePublicKeyInput).toBeVisible();
        await expect(smePublicKeyInput).toHaveValue(
            'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEg6rwXUOg3N18rZlQRS8sCmKGuB4opGtTXvYi7DkXltVzK0rEVd91HgM7L9YEyTsM9ntJ8Ye+rHey0LiUZwFwAw==',
        );

        console.log('Saving SME configuration');
        const saveSMEButton = page.getByRole('button', {
            name: /save sme configuration/i,
        });
        await expect(saveSMEButton).toBeEnabled();
        await saveSMEButton.click();

        await expect(
            page.getByText(/sme configuration saved successfully!/i),
        ).toBeVisible({ timeout: 10000 });

        console.log('Waiting for connection establishment');
        await page.waitForTimeout(1000);

        console.log('Verifying configuration persistence');
        await page.reload();

        console.log('Waiting for app container after reload');
        await page
            .locator('.app-container')
            .waitFor({ state: 'visible', timeout: 30000 });
        await expect(sidebar).toBeVisible();

        await settingsButton.click();

        await expect(
            page.getByRole('heading', { name: /sme configuration/i }),
        ).toBeVisible();

        await expect(smeUrlInput).toHaveValue('ws://localhost:12345/secondary');

        console.log('Verifying connection status');
        const copyButton = page.getByRole('button', {
            name: /copy did document/i,
        });
        await expect(copyButton).toBeEnabled();
    });
});
