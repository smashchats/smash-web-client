import { Crypto } from '@peculiar/webcrypto';
import { Page, expect, test } from '@playwright/test';
import {
    DIDDocManager,
    IMPeerIdentity,
    IMText,
    IM_CHAT_TEXT,
    SmashMessaging,
    SmashUser,
} from 'smash-node-lib';

// Import SME configuration from our app's global setup
const PORT = 12345;
const VALID_PATH = 'valid';
const socketServerUrl = `ws://localhost:${PORT}/${VALID_PATH}`;
const SME_PUBLIC_KEY = process.env.VITE_SME_PUBLIC_KEY!;

test.describe('Messaging Features', () => {
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

    test('should send a message to a peer', async ({ page }) => {
        console.log('=== Starting send message test ===');

        // Create a test peer
        console.log('Creating test peer identity');
        const testPeerIdentity = await didDocumentManager.generate();
        const preKeyPair =
            await didDocumentManager.generateNewPreKeyPair(testPeerIdentity);
        testPeerIdentity.addPreKeyPair(preKeyPair);
        const testPeer = new SmashUser(testPeerIdentity, 'test-peer');

        console.log('Configuring SME endpoint for test peer');
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

        console.log('Waiting for app initialization');
        await page
            .locator('.app-container')
            .waitFor({ state: 'visible', timeout: 10000 });
        const sidebar = page.locator('nav.sidebar');
        await expect(sidebar).toBeVisible();

        console.log('Creating new conversation');
        const newConversationButton = page.getByRole('button', {
            name: /new conversation/i,
        });
        await expect(newConversationButton).toBeVisible();
        await newConversationButton.click();

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

        console.log('Verifying conversation created');
        await expect(dialog).not.toBeVisible();
        await expect(
            page.getByText('Select a chat to start messaging'),
        ).not.toBeVisible();

        console.log('Sending test message');
        const messageInput = page.locator(
            'textarea[placeholder="Type a message..."]',
        );
        await expect(messageInput).toBeVisible();
        await messageInput.fill('Hello, test peer!');
        await messageInput.press('Enter');

        console.log('Verifying message sent');
        await expect(
            page
                .locator('.message-content .message-text')
                .getByText('Hello, test peer!'),
        ).toBeVisible();

        console.log('Test complete, cleaning up');
        await testPeer.close();
    });

    test('should receive a message from a peer', async ({ page }) => {
        console.log('=== Starting receive message test ===');

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

        console.log('Sending test message from peer');
        const message = new IMText('hey');
        await testPeer.send(webClientDidDoc, message);
        await page.waitForTimeout(2000);

        console.log('Verifying message in chat list');
        const newChatItem = page.locator(
            'button.chat-item:has(p.chat-item-preview:text("hey"))',
        );
        await expect(newChatItem).toBeVisible();
        await expect(newChatItem.locator('p.chat-item-preview')).toHaveText(
            'hey',
        );
        await expect(newChatItem.locator('.chat-item-time')).toBeVisible();

        console.log('Verifying message in conversation');
        await newChatItem.click();

        const messagesContainer = page.locator('.messages-container');
        await expect(messagesContainer).toBeVisible();
        await expect(
            messagesContainer.locator(
                '.message.incoming .message-content .message-text',
            ),
        ).toHaveText('hey');
        await expect(
            messagesContainer.locator(
                '.message.incoming .message-content .message-meta .message-time',
            ),
        ).toBeVisible();

        const senderDid = page.locator('.chat-header-did-text');
        await expect(senderDid).toBeVisible();
        await expect(senderDid).toHaveText(testPeerIdentity.did);

        console.log('Test complete, cleaning up');
        await testPeer.close();
    });

    test.describe('Message Status Updates', () => {
        let testPeer: SmashMessaging;
        let testPeerIdentity: IMPeerIdentity;
        let page: Page;

        test.beforeEach(async ({ page: testPage }) => {
            page = testPage;
            console.log('=== Setting up test peer and web client ===');

            console.log('Creating test peer identity');
            testPeerIdentity = await didDocumentManager.generate();
            const preKeyPair =
                await didDocumentManager.generateNewPreKeyPair(
                    testPeerIdentity,
                );
            testPeerIdentity.addPreKeyPair(preKeyPair);

            console.log('Configuring test peer messaging');
            testPeer = new SmashMessaging(
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

            console.log('Generating web client identity');
            const generateButton = page.locator('button.button--primary');
            await generateButton.click();
            await expect(generateButton).toHaveAttribute(
                'data-loading',
                'true',
            );

            console.log('Waiting for app initialization');
            await page
                .locator('.app-container')
                .waitFor({ state: 'visible', timeout: 10000 });
            const sidebar = page.locator('nav.sidebar');
            await expect(sidebar).toBeVisible();

            console.log('Getting web client DID document');
            const settingsButton = sidebar
                .locator('button.sidebar-button')
                .nth(2);
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

            console.log('Creating conversation with test peer');
            const messagesButton = sidebar
                .locator('button.sidebar-button')
                .first();
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
        });

        test.afterEach(async () => {
            await testPeer?.close();
        });

        test('should show delivered status when message is received by online peer', async ({
            page,
        }) => {
            console.log('=== Testing delivered status ===');

            console.log('Sending test message');
            const messageInput = page.locator(
                'textarea[placeholder="Type a message..."]',
            );
            await expect(messageInput).toBeVisible();
            await messageInput.fill('Test message for delivered status');
            await messageInput.press('Enter');

            console.log('Verifying message content');
            const messagesContainer = page.locator('.messages-container');
            await expect(
                messagesContainer.locator('.message-content .message-text'),
            ).toHaveText('Test message for delivered status');

            console.log('Waiting for delivered status');
            const statusIcon = messagesContainer.locator(
                '.message.outgoing .message-content .message-meta .message-status .lucide-check-check',
            );
            await expect(statusIcon).toBeVisible();
            await expect(statusIcon).toHaveCSS('opacity', '0.5');
        });

        test('should show read status when peer acknowledges message as read', async ({
            page,
        }) => {
            console.log('=== Testing read status ===');

            testPeer.on(IM_CHAT_TEXT, (did, message) => {
                testPeer.ackMessagesRead(did, [message.sha256!]);
            });

            console.log('Sending test message');
            const messageInput = page.locator(
                'textarea[placeholder="Type a message..."]',
            );
            await expect(messageInput).toBeVisible();
            await messageInput.fill('Test message for read status');
            await messageInput.press('Enter');

            console.log('Verifying initial sent status');
            const messagesContainer = page.locator('.messages-container');
            await expect(
                messagesContainer.locator('.message-content .message-text'),
            ).toHaveText('Test message for read status');

            console.log('Waiting for read status');
            const readStatusIcon = messagesContainer.locator(
                '.message.outgoing .message-content .message-meta .message-status .lucide-check-check',
            );
            await expect(readStatusIcon).toBeVisible();
            await expect(readStatusIcon).toHaveCSS('opacity', '1');
        });
    });

    // todo offline peer
});
