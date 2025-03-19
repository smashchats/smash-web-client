import { Crypto } from '@peculiar/webcrypto';
import { expect, test } from '@playwright/test';
import { DIDDocManager, SmashMessaging, SmashUser } from 'smash-node-lib';
import { IMText } from 'smash-node-lib';

// Import SME configuration from our app's global setup
const PORT = 12345;
const VALID_PATH = 'valid';
const socketServerUrl = `ws://localhost:${PORT}/${VALID_PATH}`;
const SME_PUBLIC_KEY = process.env.VITE_SME_PUBLIC_KEY!;

test.describe('Messaging Features', () => {
    let didDocumentManager: DIDDocManager;

    // Set up crypto engine once for all tests
    test.beforeAll(() => {
        console.log('--------------------------------');
        console.log('Setting up crypto engine');
        console.log('--------------------------------');

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
        console.log('Setting up DID document manager');
        didDocumentManager = new DIDDocManager();
        SmashUser.use(didDocumentManager);

        // Grant clipboard permissions
        console.log('Granting clipboard permissions');
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
        console.log('--------------------------------');
        console.log('Starting send message test');
        console.log('--------------------------------');

        // Create a test peer
        console.log('Creating test peer identity');
        const testPeerIdentity = await didDocumentManager.generate();
        const preKeyPair =
            await didDocumentManager.generateNewPreKeyPair(testPeerIdentity);
        testPeerIdentity.addPreKeyPair(preKeyPair);
        const testPeer = new SmashUser(testPeerIdentity, 'test-peer');

        // Configure SME endpoint for test peer
        console.log('Configuring SME endpoint for test peer');
        await testPeer.endpoints.reset([
            {
                url: socketServerUrl,
                smePublicKey: SME_PUBLIC_KEY,
            },
        ]);

        // Get the test peer's DID document and register it
        console.log('Registering test peer DID document');
        const testPeerDidDoc = await testPeer.getDIDDocument();
        didDocumentManager.set(testPeerDidDoc);
        const testPeerDidDocString = JSON.stringify(testPeerDidDoc);

        // Generate identity in the web interface
        console.log('Generating web client identity');
        const generateButton = page.locator('button.button--primary');
        await generateButton.click();
        await expect(generateButton).toHaveAttribute('data-loading', 'true');

        // Check for any error messages in the toast
        const errorToast = page.locator('.toast-viewport [role="alert"]');
        const hasError = await errorToast.isVisible();
        if (hasError) {
            console.log('Error toast found:', await errorToast.textContent());
        }

        // Wait for app initialization
        console.log('Waiting for app initialization');
        await page
            .locator('.app-container')
            .waitFor({ state: 'visible', timeout: 30000 });
        const sidebar = page.locator('nav.sidebar');
        await expect(sidebar).toBeVisible();

        // Create new conversation
        console.log('Creating new conversation');
        const newConversationButton = page.getByRole('button', {
            name: /new conversation/i,
        });
        await expect(newConversationButton).toBeVisible();
        await newConversationButton.click();

        // Set up conversation with test peer
        console.log('Setting up conversation with test peer');
        const dialog = page.locator('div[role="dialog"]');
        await expect(dialog).toBeVisible();

        const didInput = dialog.locator('textarea');
        await didInput.fill(testPeerDidDocString);

        const createButton = dialog.getByRole('button', {
            name: /create conversation/i,
        });
        await expect(createButton).toBeEnabled();
        await createButton.click();

        // Verify conversation created
        console.log('Verifying conversation created');
        await expect(dialog).not.toBeVisible();
        await expect(
            page.getByText('Select a chat to start messaging'),
        ).not.toBeVisible();

        // Send test message
        console.log('Sending test message');
        const messageInput = page.locator(
            'textarea[placeholder="Type a message..."]',
        );
        await expect(messageInput).toBeVisible();
        await messageInput.fill('Hello, test peer!');
        await messageInput.press('Enter');

        // Verify message sent
        console.log('Verifying message sent');
        await expect(
            page
                .locator('.messages-container .text-sm.whitespace-pre-wrap')
                .getByText('Hello, test peer!'),
        ).toBeVisible();

        // Clean up
        console.log('Test complete, cleaning up');
        await testPeer.close();
    });

    test('should receive a message from a peer', async ({ page }) => {
        console.log('--------------------------------');
        console.log('Starting receive message test');
        console.log('--------------------------------');

        // Create and configure test peer
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

        // Register test peer's DID document
        console.log('Registering test peer DID document');
        const testPeerDidDoc = await testPeer.getDIDDocument();
        didDocumentManager.set(testPeerDidDoc);
        const testPeerDidDocString = JSON.stringify(testPeerDidDoc);

        // Generate web client identity
        console.log('Generating web client identity');
        const generateButton = page.locator('button.button--primary');
        await generateButton.click();
        await expect(generateButton).toHaveAttribute('data-loading', 'true');

        // Wait for app initialization
        console.log('Waiting for app initialization');
        await page
            .locator('.app-container')
            .waitFor({ state: 'visible', timeout: 30000 });
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

        // Send test message
        console.log('Sending test message from peer');
        const message = new IMText('hey');
        await testPeer.send(webClientDidDoc, message);
        await page.waitForTimeout(2000);

        // Verify message in chat list
        console.log('Verifying message in chat list');
        const chatItem = page.locator('.chat-item');
        await expect(chatItem).toBeVisible();
        await expect(chatItem.locator('.chat-badge')).toHaveText('1');
        await expect(chatItem.locator('.chat-item-preview')).toHaveText('hey');
        await expect(chatItem.locator('.chat-item-time')).toBeVisible();

        // Verify message in conversation
        console.log('Verifying message in conversation');
        await chatItem.click();

        const messagesContainer = page.locator('.messages-container');
        await expect(messagesContainer).toBeVisible();
        await expect(
            messagesContainer.locator('.text-sm.whitespace-pre-wrap'),
        ).toHaveText('hey');
        await expect(
            messagesContainer.locator('.text-xs.opacity-70'),
        ).toBeVisible();

        const senderDid = page.locator(
            '.message.incoming .font-medium.text-sm.text-muted',
        );
        await expect(senderDid).toBeVisible();
        await expect(senderDid).toHaveText(testPeerIdentity.did);

        // Clean up
        console.log('Test complete, cleaning up');
        await testPeer.close();
    });
});
