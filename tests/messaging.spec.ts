import { Crypto } from '@peculiar/webcrypto';
import { expect, test } from '@playwright/test';
import { DIDDocManager, SmashUser } from 'smash-node-lib';

// Import SME configuration from our app's global setup
const PORT = 12345;
const VALID_PATH = 'valid';
const socketServerUrl = `ws://localhost:${PORT}/${VALID_PATH}`;
const SME_PUBLIC_KEY = process.env.VITE_SME_PUBLIC_KEY!;

test.describe('Messaging Features', () => {
    let didDocumentManager: DIDDocManager;

    // Set up crypto engine once for all tests
    test.beforeAll(() => {
        const crypto = new Crypto();
        SmashUser.setCrypto(crypto);

        if (!SME_PUBLIC_KEY) {
            throw new Error(
                'SME_PUBLIC_KEY not found in environment variables',
            );
        }
    });

    test.beforeEach(async ({ page, context }) => {
        console.log('--------------------------------');
        console.log('Starting test');
        console.log('--------------------------------');

        // Set up DID document manager
        didDocumentManager = new DIDDocManager();
        SmashUser.use(didDocumentManager);

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

    test('should send a message to a peer', async ({ page }) => {
        // Create a test peer
        const testPeerIdentity = await didDocumentManager.generate();
        const preKeyPair =
            await didDocumentManager.generateNewPreKeyPair(testPeerIdentity);
        testPeerIdentity.addPreKeyPair(preKeyPair);
        const testPeer = new SmashUser(testPeerIdentity, 'test-peer');

        // Configure SME endpoint for test peer
        await testPeer.endpoints.reset([
            {
                url: socketServerUrl,
                smePublicKey: SME_PUBLIC_KEY,
            },
        ]);

        // Get the test peer's DID document and register it
        const testPeerDidDoc = await testPeer.getDIDDocument();
        didDocumentManager.set(testPeerDidDoc);
        const testPeerDidDocString = JSON.stringify(testPeerDidDoc);

        // Generate identity in the web interface
        const generateButton = page.locator('button.button--primary');
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

        // Click "New Conversation" button
        const newConversationButton = page.getByRole('button', {
            name: /new conversation/i,
        });
        await expect(newConversationButton).toBeVisible();
        await newConversationButton.click();

        // Wait for dialog to appear
        const dialog = page.locator('div[role="dialog"]');
        await expect(dialog).toBeVisible();

        // Paste the test peer's DID document
        const didInput = dialog.locator('textarea');
        await didInput.fill(testPeerDidDocString);

        // Create conversation
        const createButton = dialog.getByRole('button', {
            name: /create conversation/i,
        });
        await expect(createButton).toBeEnabled();
        await createButton.click();

        // Wait for dialog to close and conversation to appear
        await expect(dialog).not.toBeVisible();
        await expect(
            page.getByText('Select a chat to start messaging'),
        ).not.toBeVisible();

        // Type and send a message
        const messageInput = page.locator(
            'textarea[placeholder="Type a message..."]',
        );
        await expect(messageInput).toBeVisible();
        await messageInput.fill('Hello, test peer!');
        await messageInput.press('Enter');

        // Wait for message to appear in chat
        await expect(
            page
                .locator('.messages-container .text-sm.whitespace-pre-wrap')
                .getByText('Hello, test peer!'),
        ).toBeVisible();

        // Clean up
        await testPeer.close();
    });
});
