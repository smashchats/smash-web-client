import { Crypto } from '@peculiar/webcrypto';
import { expect, test } from '@playwright/test';
import {
    DIDDocManager,
    IMPeerIdentity,
    SmashMessaging,
    SmashUser,
} from 'smash-node-lib';

// Import SME configuration from our app's global setup
const PORT = 12345;
const VALID_PATH = 'valid';
const socketServerUrl = `ws://localhost:${PORT}/${VALID_PATH}`;
const SME_PUBLIC_KEY = process.env.VITE_SME_PUBLIC_KEY!;

test.describe('Profile Management', () => {
    let didDocumentManager: DIDDocManager;
    let testPeer: SmashMessaging;
    let testPeerIdentity: IMPeerIdentity;
    // let webClientDidDoc: DIDDocument;

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

    test('should receive and display profile updates from remote peer', async ({
        page,
    }) => {
        console.log('=== Testing profile update reception ===');

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
        // webClientDidDoc = JSON.parse(clipboardContent);

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

        // Step 3: Establish active conversation with a dummy message
        console.log('Establishing active conversation');
        const messageInput = page.locator(
            'textarea[placeholder="Type a message..."]',
        );
        await expect(messageInput).toBeVisible();
        await messageInput.fill('Hello, test peer!');
        await messageInput.press('Enter');

        // Wait for message to be sent and received
        await expect(
            page
                .locator('.message-content .message-text')
                .getByText('Hello, test peer!'),
        ).toBeVisible();

        // Step 4: Update test peer's profile
        console.log('Updating test peer profile');
        await testPeer.updateMeta({
            title: 'Updated Test Peer',
            description: 'This is an updated profile',
        });

        // Wait for profile update to be processed
        console.log('Waiting for profile update to be processed');
        await page.waitForFunction(
            () => {
                const title =
                    document.querySelector('.chat-header-title')?.textContent;
                return title === 'Updated Test Peer';
            },
            { timeout: 1000 },
        );

        // Step 5: Verify profile update in chat header
        console.log('Verifying profile update in chat header');
        const chatHeader = page.locator('.chat-header');
        await expect(chatHeader).toBeVisible();
        await expect(chatHeader.locator('.chat-header-title')).toHaveText(
            'Updated Test Peer',
        );

        // Step 6: Verify profile update in chat list
        console.log('Verifying profile update in chat list');
        const chatItem = page.locator('.chat-item');
        await expect(chatItem).toBeVisible();
        await expect(chatItem.locator('.chat-item-name')).toHaveText(
            'Updated Test Peer',
        );

        console.log('Test complete, cleaning up');
        await testPeer.close();
    });

    test('should update and persist own profile', async ({ page }) => {
        console.log('=== Testing profile update and persistence ===');

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

        // Set up profile update tracking
        let profileUpdateReceived = false;
        testPeer.on('org.improto.profile', (sender, message) => {
            if (message.data.title === 'Updated Test Peer') {
                console.log('Profile update received by test peer', {
                    sender,
                    message,
                });
                profileUpdateReceived = true;
            }
        });

        console.log('Registering test peer DID document');
        const testPeerDidDoc = await testPeer.getDIDDocument();
        didDocumentManager.set(testPeerDidDoc);
        const testPeerDidDocString = JSON.stringify(testPeerDidDoc);

        // Step 2: Generate identity
        console.log('Generating identity');
        const generateButton = page.locator('button.button--primary');
        await generateButton.click();
        await expect(generateButton).toHaveAttribute('data-loading', 'true');

        // Step 3: Create conversation with test peer
        console.log('Creating conversation with test peer');
        const sidebar = page.locator('nav.sidebar');
        await expect(sidebar).toBeVisible();
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

        // Step 4: Establish active conversation
        console.log('Establishing active conversation');
        const messageInput = page.locator(
            'textarea[placeholder="Type a message..."]',
        );
        await expect(messageInput).toBeVisible();
        await messageInput.fill('Hello, test peer!');
        await messageInput.press('Enter');

        // Wait for message to be sent and received
        await expect(
            page
                .locator('.message-content .message-text')
                .getByText('Hello, test peer!'),
        ).toBeVisible();

        // Step 5: Update profile through settings
        console.log('Updating profile through settings');
        const settingsButton = sidebar.locator('button.sidebar-button').nth(2);
        await settingsButton.click();
        await expect(
            page.getByRole('heading', { name: /profile settings/i }),
        ).toBeVisible();

        const titleInput = page.locator(
            'input[placeholder="Enter your title"]',
        );
        const descriptionInput = page.locator(
            'textarea[placeholder="Enter your description"]',
        );
        await titleInput.fill('Updated Test Peer');
        await descriptionInput.fill('This is an updated profile');

        // Wait for profile update to be received by test peer
        console.log('Waiting for profile update to be received by test peer');
        await page.waitForTimeout(2000); // Give time for the debounced save to trigger

        // Verify profile update was received by test peer
        console.log('Verifying profile update was received by test peer');
        expect(profileUpdateReceived).toBeTruthy();

        console.log('Test complete, cleaning up');
        await testPeer.close();
    });

    test('should display profile information in chat header', async ({
        page,
    }) => {
        console.log('=== Testing chat header profile display ===');

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

        // Set initial profile
        await testPeer.updateMeta({
            title: 'Test Peer',
            description: 'Initial profile',
        });

        console.log('Registering test peer DID document');
        const testPeerDidDoc = await testPeer.getDIDDocument();
        didDocumentManager.set(testPeerDidDoc);
        const testPeerDidDocString = JSON.stringify(testPeerDidDoc);

        // Step 2: Set up web client
        console.log('Generating web client identity');
        const generateButton = page.locator('button.button--primary');
        await generateButton.click();
        await expect(generateButton).toHaveAttribute('data-loading', 'true');

        // Step 3: Create conversation
        console.log('Creating conversation');
        const sidebar = page.locator('nav.sidebar');
        await expect(sidebar).toBeVisible();
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

        // Step 4: Establish active conversation
        console.log('Establishing active conversation');
        const messageInput = page.locator(
            'textarea[placeholder="Type a message..."]',
        );
        await expect(messageInput).toBeVisible();
        await messageInput.fill('Hello, test peer!');
        await messageInput.press('Enter');

        // Wait for message to be sent and received
        await expect(
            page
                .locator('.message-content .message-text')
                .getByText('Hello, test peer!'),
        ).toBeVisible();

        // Step 5: Verify chat header
        console.log('Verifying chat header');
        const chatHeader = page.locator('.chat-header');
        await expect(chatHeader).toBeVisible();

        // Verify title
        await expect(chatHeader.locator('.chat-header-title')).toHaveText(
            'Test Peer',
        );

        // Verify DID
        await expect(chatHeader.locator('.chat-header-did-text')).toHaveText(
            testPeerIdentity.did,
        );

        // Step 6: Update peer profile and verify header updates
        console.log('Updating peer profile');
        await testPeer.updateMeta({
            title: 'Updated Test Peer',
            description: 'Updated profile',
        });

        // Wait for profile update to be processed
        console.log('Waiting for profile update to be processed');
        await page.waitForFunction(
            () => {
                const title =
                    document.querySelector('.chat-header-title')?.textContent;
                return title === 'Updated Test Peer';
            },
            { timeout: 1000 },
        );

        await expect(chatHeader.locator('.chat-header-title')).toHaveText(
            'Updated Test Peer',
        );

        console.log('Test complete, cleaning up');
        await testPeer.close();
    });
});
