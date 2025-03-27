import { Crypto } from '@peculiar/webcrypto';
import { expect, test } from '@playwright/test';
import {
    DIDDocManager,
    DIDDocument,
    IMMediaEmbedded,
    SmashMessaging,
} from 'smash-node-lib';

// Import SME configuration
const PORT = 12345;
const VALID_PATH = 'valid';
const socketServerUrl = `ws://localhost:${PORT}/${VALID_PATH}`;
const SME_PUBLIC_KEY = process.env.VITE_SME_PUBLIC_KEY!;

test.describe('Media Messages', () => {
    let didDocumentManager: DIDDocManager;
    let testPeer: SmashMessaging;
    let webClientDidDoc: DIDDocument;

    test.beforeAll(() => {
        console.log('=== Setting up crypto engine ===');
        const crypto = new Crypto();
        SmashMessaging.setCrypto(crypto);

        if (!SME_PUBLIC_KEY) {
            throw new Error(
                'SME_PUBLIC_KEY not found in environment variables',
            );
        }
    });

    test.beforeEach(async ({ page, context }) => {
        console.log('=== Starting test ===');

        // Set up DID document manager
        didDocumentManager = new DIDDocManager();
        SmashMessaging.use(didDocumentManager);

        // Set up test peer
        const testPeerIdentity = await didDocumentManager.generate();
        const preKeyPair =
            await didDocumentManager.generateNewPreKeyPair(testPeerIdentity);
        testPeerIdentity.addPreKeyPair(preKeyPair);
        testPeer = new SmashMessaging(testPeerIdentity, 'test-peer', 'DEBUG');

        // Configure SME endpoint
        await testPeer.endpoints.reset([
            {
                url: socketServerUrl,
                smePublicKey: SME_PUBLIC_KEY,
            },
        ]);

        // Register test peer DID document
        const testPeerDidDoc = await testPeer.getDIDDocument();
        didDocumentManager.set(testPeerDidDoc);

        // Set up web client
        await page.goto('/');
        await context.grantPermissions(['clipboard-read', 'clipboard-write']);

        // Generate identity
        const generateButton = page.locator('button.button--primary');
        await generateButton.click();
        await expect(generateButton).toHaveAttribute('data-loading', 'true');

        // Wait for app initialization
        await page
            .locator('.app-container')
            .waitFor({ state: 'visible', timeout: 10000 });
        const sidebar = page.locator('nav.sidebar');
        await expect(sidebar).toBeVisible();

        // Get web client DID document
        const settingsButton = sidebar.locator('button.sidebar-button').nth(2);
        await settingsButton.click();
        const copyButton = page.getByRole('button', {
            name: /copy did document/i,
        });
        await copyButton.click();

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
        webClientDidDoc = JSON.parse(clipboardContent);

        // Create conversation
        const messagesButton = sidebar.locator('button.sidebar-button').first();
        await messagesButton.click();
        const newConversationButton = page.getByRole('button', {
            name: /new conversation/i,
        });
        await newConversationButton.click();

        const dialog = page.locator('div[role="dialog"]');
        await expect(dialog).toBeVisible();
        await dialog.locator('textarea').fill(JSON.stringify(testPeerDidDoc));
        await dialog
            .getByRole('button', { name: /create conversation/i })
            .click();

        await expect(dialog).not.toBeVisible();
        await expect(
            page.getByText('Select a chat to start messaging'),
        ).not.toBeVisible();
    });

    test.afterEach(async () => {
        if (testPeer) {
            await testPeer.close();
        }
    });

    test('should send and receive image messages', async ({ page }) => {
        const imageData = {
            mimeType: 'image/png',
            content:
                'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVQI12NgAAAAAgAB4iG8MwAAAABJRU5ErkJggg==',
            alt: 'Test image',
            aspectRatio: { width: 1, height: 1 },
        };

        await testPeer.send(webClientDidDoc, new IMMediaEmbedded(imageData));

        // Wait for message in chat list
        await page.waitForSelector('.chat-item-preview:has-text("📷 Image")');
        await page.click('.chat-item');

        // Verify message display
        const imageElement = page.locator('.media-image');
        await expect(imageElement).toBeVisible();
        await expect(imageElement).toHaveAttribute(
            'src',
            `data:image/png;base64,${imageData.content}`,
        );
        await expect(imageElement).toHaveAttribute('alt', imageData.alt);
    });

    test('should handle image loading errors gracefully', async ({ page }) => {
        const imageData = {
            mimeType: 'image/png',
            content: 'invalid-base64-data',
            alt: 'Test image',
            aspectRatio: { width: 1, height: 1 },
        };

        await testPeer.send(webClientDidDoc, new IMMediaEmbedded(imageData));

        // Wait for error message
        await page.waitForSelector('.media-error');
        await expect(page.locator('.media-error')).toHaveText(
            'Failed to load image',
        );
    });

    test('should maintain aspect ratio of images', async ({ page }) => {
        const imageData = {
            mimeType: 'image/png',
            content:
                'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVQI12NgAAAAAgAB4iG8MwAAAABJRU5ErkJggg==',
            alt: 'Test image',
            aspectRatio: { width: 16, height: 9 },
        };

        await testPeer.send(webClientDidDoc, new IMMediaEmbedded(imageData));

        // Wait for image and verify aspect ratio
        await page.waitForSelector('.media-image');
        const style = await page.locator('.media-image').getAttribute('style');
        expect(style).toContain('aspect-ratio: 16 / 9');
    });
});
