import { Crypto } from '@peculiar/webcrypto';
import { expect, test } from '@playwright/test';
import {
    DIDDocManager,
    DIDDocument,
    IMPeerIdentity,
    IMText,
    SmashMessaging,
    SmashUser,
} from 'smash-node-lib';

// Import SME configuration from our app's global setup
const PORT = 12345;
const VALID_PATH = 'valid';
const socketServerUrl = `ws://localhost:${PORT}/${VALID_PATH}`;
const SME_PUBLIC_KEY = process.env.VITE_SME_PUBLIC_KEY!;

test.describe('Offline Storage and App Reload', () => {
    let didDocumentManager: DIDDocManager;
    let testPeer: SmashMessaging;
    let testPeerIdentity: IMPeerIdentity;
    let webClientDidDoc: DIDDocument;

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

    test('should maintain conversation state after app reload', async ({
        page,
    }) => {
        console.log('=== Testing offline storage and app reload ===');

        // Step 1: Set up test peer
        console.log('Creating test peer identity');
        testPeerIdentity = await didDocumentManager.generate();
        const preKeyPair =
            await didDocumentManager.generateNewPreKeyPair(testPeerIdentity);
        testPeerIdentity.addPreKeyPair(preKeyPair);

        console.log('Configuring test peer messaging');
        testPeer = new SmashMessaging(testPeerIdentity, 'test-peer', 'DEBUG');
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

        // Step 2: Set up web client and create conversation
        console.log('Generating web client identity');
        const generateButton = page.locator('button.button--primary');
        await generateButton.click();
        await expect(generateButton).toHaveAttribute('data-loading', 'true');

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
        webClientDidDoc = JSON.parse(clipboardContent);

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

        // Step 3: Send a message from web client
        console.log('Sending test message from web client');
        const messageInput = page.locator(
            'textarea[placeholder="Type a message..."]',
        );
        await expect(messageInput).toBeVisible();
        await messageInput.fill('Hello, test peer!');
        await messageInput.press('Enter');

        // Verify message was sent
        console.log('Verifying message sent');
        await expect(
            page
                .locator('.messages-container .text-sm.whitespace-pre-wrap')
                .getByText('Hello, test peer!'),
        ).toBeVisible();

        // Step 4: Send a message from test peer
        console.log('Sending test message from peer');
        const peerMessage = new IMText('Hello from test peer!');
        await testPeer.send(webClientDidDoc, peerMessage);
        await page.waitForTimeout(2000);

        // Verify message appears in chat list
        console.log('Verifying message in chat list');
        const chatItem = page.locator('.chat-item');
        await expect(chatItem).toBeVisible();
        await expect(chatItem.locator('.chat-badge')).toHaveText('1');
        await expect(chatItem.locator('.chat-item-preview')).toHaveText(
            'Hello from test peer!',
        );

        // Step 5: Force reload the page
        console.log('Reloading the page');
        await page.reload();

        // Step 6: Verify conversation state is maintained
        console.log('Verifying conversation state after reload');
        await page
            .locator('.app-container')
            .waitFor({ state: 'visible', timeout: 30000 });
        await expect(sidebar).toBeVisible();

        // Verify chat list
        await expect(chatItem).toBeVisible();
        await expect(chatItem.locator('.chat-badge')).toHaveText('1');
        await expect(chatItem.locator('.chat-item-preview')).toHaveText(
            'Hello from test peer!',
        );

        // Click conversation and verify messages
        await chatItem.click();
        const messagesContainer = page.locator('.messages-container');
        await expect(messagesContainer).toBeVisible();

        // Verify both messages are present
        await expect(
            messagesContainer
                .locator('.text-sm.whitespace-pre-wrap')
                .getByText('Hello, test peer!'),
        ).toBeVisible();
        await expect(
            messagesContainer
                .locator('.text-sm.whitespace-pre-wrap')
                .getByText('Hello from test peer!'),
        ).toBeVisible();

        // Verify sender DID is visible
        const senderDid = page.locator(
            '.message.incoming .font-medium.text-sm.text-muted',
        );
        await expect(senderDid).toBeVisible();
        await expect(senderDid).toHaveText(testPeerIdentity.did);

        console.log('Test complete, cleaning up');
        await testPeer.close();
    });
});
