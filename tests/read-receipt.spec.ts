import { Crypto } from '@peculiar/webcrypto';
import { expect, test } from '@playwright/test';
import {
    DIDDocManager,
    IMText,
    SmashMessaging,
    SmashUser,
} from 'smash-node-lib';

// Import SME configuration from our app's global setup
const PORT = 12345;
const VALID_PATH = 'valid';
const socketServerUrl = `ws://localhost:${PORT}/${VALID_PATH}`;
const SME_PUBLIC_KEY = process.env.VITE_SME_PUBLIC_KEY!;

test.describe('Read Receipt Features', () => {
    let didDocumentManager: DIDDocManager;

    test.beforeAll(() => {
        console.log('=== Setting up crypto engine ===');
        const crypto = new Crypto();
        SmashUser.setCrypto(crypto);

        if (!SME_PUBLIC_KEY) {
            throw new Error(
                'SME_PUBLIC_KEY not found in environment variables',
            );
        }
    });

    test.beforeEach(async ({ page, context }) => {
        console.log('=== Starting test ===');
        console.log('Setting up DID document manager');
        didDocumentManager = new DIDDocManager();
        SmashUser.use(didDocumentManager);

        console.log('Granting clipboard permissions');
        await context.grantPermissions(['clipboard-read', 'clipboard-write']);

        await page.goto('/');

        // Listen to console messages
        page.on('console', (msg) => {
            console.log(`Browser [${msg.type()}]: ${msg.text()}`);
            if (msg.type() === 'error') {
                console.error('Browser error:', msg.text());
            }
        });
    });

    test('should mark messages as read when viewed', async ({ page }) => {
        console.log('=== Testing read receipt functionality ===');

        // Create test peer
        console.log('Creating test peer identity');
        const testPeerIdentity = await didDocumentManager.generate();
        const preKeyPair =
            await didDocumentManager.generateNewPreKeyPair(testPeerIdentity);
        testPeerIdentity.addPreKeyPair(preKeyPair);

        console.log('Configuring test peer messaging');
        const testPeer = new SmashMessaging(
            testPeerIdentity,
            'test-peer',
            'DEBUG',
        );
        await testPeer.endpoints.reset([
            {
                url: socketServerUrl,
                smePublicKey: SME_PUBLIC_KEY,
            },
        ]);

        console.log('Registering test peer DID document');
        const testPeerDidDoc = await testPeer.getDIDDocument();
        didDocumentManager.set(testPeerDidDoc);
        const testPeerDidDocString = JSON.stringify(testPeerDidDoc);

        // Set up web client
        console.log('Generating web client identity');
        const generateButton = page.locator('button.button--primary');
        await generateButton.click();
        await expect(generateButton).toHaveAttribute('data-loading', 'true');

        console.log('Waiting for app initialization');
        await page
            .locator('.app-container')
            .waitFor({ state: 'visible', timeout: 10000 });
        const sidebar = page.locator('nav.sidebar');
        await expect(sidebar).toBeVisible();

        // Get web client DID document
        console.log('Getting web client DID document');
        const settingsButton = sidebar.locator('button.sidebar-button').nth(2);
        await settingsButton.click();
        await expect(
            page.getByRole('heading', { name: /your identity/i }),
        ).toBeVisible();

        const copyButton = page.getByRole('button', {
            name: /copy did document/i,
        });
        await copyButton.click();
        await expect(page.getByText(/copied!/i)).toBeVisible();

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
        const webClientDidDoc = JSON.parse(clipboardContent);

        // Create conversation
        console.log('Creating conversation with test peer');
        const messagesButton = sidebar.locator('button.sidebar-button').first();
        await messagesButton.click();

        const newConversationButton = page.getByRole('button', {
            name: /new conversation/i,
        });
        await newConversationButton.click();

        const dialog = page.locator('div[role="dialog"]');
        await expect(dialog).toBeVisible();

        const didInput = dialog.locator('textarea');
        await didInput.fill(testPeerDidDocString);

        const createButton = dialog.getByRole('button', {
            name: /create conversation/i,
        });
        await createButton.click();

        await expect(dialog).not.toBeVisible();
        await expect(
            page.getByText('Select a chat to start messaging'),
        ).not.toBeVisible();

        // Set up read receipt tracking
        let readReceiptReceived = false;
        testPeer.on('status', (status, messageIds) => {
            if (status === 'read') {
                console.log('Read receipt received by test peer', {
                    messageIds,
                });
                readReceiptReceived = true;
            }
        });

        // Send test message
        console.log('Sending test message from peer');
        const message = new IMText('message that should be marked as read');
        await testPeer.send(webClientDidDoc, message);
        await page.waitForTimeout(500);

        console.log('Verifying message appears in chat list');
        const chatItem = page.locator(
            'button.chat-item:has(p.chat-item-preview:text("message that should be marked as read"))',
        );
        await expect(chatItem).toBeVisible();
        await expect(chatItem.locator('.chat-badge')).toHaveText('1');

        // Click conversation and simulate interaction
        console.log('Clicking on conversation to view message');
        await chatItem.click();

        console.log('Simulating user interaction with the conversation');
        await page.mouse.move(300, 300);
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('ArrowUp');

        // Wait for read receipt
        console.log('Waiting for message to be marked as read');
        await page.waitForTimeout(2000);

        // Verify read receipt was received
        console.log('Verifying read receipt was received by test peer');
        expect(readReceiptReceived).toBeTruthy();

        console.log('Test complete, cleaning up');
        await testPeer.close();
    });
});
