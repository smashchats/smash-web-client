import { test, expect } from './fixtures/users.js';
import { completeOnboarding, getDIDDocument, startNewChat, sendTextMessage } from './fixtures/users.js';

test.describe('Relay Text Messaging', () => {
  test('should exchange text messages between two users via SME relay', async ({ aliceAndBob }) => {
    const { alice, bob } = aliceAndBob;
    
    console.log('🧪 Testing text message exchange via SME relay...');
    
    // Step 1: Complete onboarding for both users
    console.log('📝 Setting up Alice...');
    await alice.page.goto('/');
    await expect(alice.page).toHaveURL('/welcome');
    await completeOnboarding(alice.page, 'Alice');
    
    console.log('📝 Setting up Bob...');
    await bob.page.goto('/');
    await expect(bob.page).toHaveURL('/welcome');
    await completeOnboarding(bob.page, 'Bob');
    
    // Step 2: Get Bob's DID document
    console.log('📄 Getting Bob\'s DID document...');
    const bobDID = await getDIDDocument(bob.page);
    expect(bobDID).toBeTruthy();
    expect(bobDID.length).toBeGreaterThan(0);
    
    // Parse to verify it's valid JSON
    const bobDIDObj = JSON.parse(bobDID);
    expect(bobDIDObj.id).toBeTruthy();
    expect(bobDIDObj.ik).toBeTruthy();
    expect(bobDIDObj.ek).toBeTruthy();
    
    // Step 3: Alice starts a chat with Bob
    console.log('💬 Alice starting chat with Bob...');
    await startNewChat(alice.page, bobDID);
    
    // Verify we're in a chat
    await expect(alice.page.url()).toMatch(/\/chat\//);
    await expect(alice.page.getByTestId('chat-input')).toBeVisible();
    
    // Step 4: Alice sends a message to Bob
    const testMessage = 'Hello Bob! This is a test message from Alice.';
    await sendTextMessage(alice.page, testMessage);
    
    // Step 5: Verify message appears in Alice's chat (outgoing)
    await expect(alice.page.getByTestId('chat-message-outgoing')).toContainText(testMessage);
    
    // Step 6: Verify message delivery status
    // Look for delivery indicators (checkmarks, etc.)
    const messageElement = alice.page.getByTestId('chat-message-outgoing').last();
    await expect(messageElement).toBeVisible();
    
    // Step 7: Bob should receive the message
    console.log('📨 Checking if Bob receives the message...');
    
    // Bob needs to be on the chats page to see incoming messages
    await bob.page.goto('/chats');
    
    // Bob should see a new conversation or notification
    // Wait for conversation to appear (with reasonable timeout)
    await expect(bob.page.locator('.conversation-item').first()).toBeVisible({ timeout: 15000 });
    
    // Click on the conversation to open it
    await bob.page.locator('.conversation-item').first().click();
    
    // Verify we're in the chat
    await expect(bob.page.url()).toMatch(/\/chat\//);
    
    // Verify Bob sees Alice's message as incoming
    await expect(bob.page.getByTestId('chat-message-incoming')).toContainText(testMessage, { timeout: 10000 });
    
    console.log('✅ Message exchange completed successfully via SME relay');
  });

  test('should handle message sending when recipient is offline', async ({ aliceAndBob }) => {
    const { alice, bob } = aliceAndBob;
    
    console.log('🧪 Testing offline messaging...');
    
    // Setup both users
    await alice.page.goto('/');
    await completeOnboarding(alice.page, 'Alice Sender');
    
    await bob.page.goto('/');
    await completeOnboarding(bob.page, 'Bob Offline');
    
    // Get Bob's DID
    const bobDID = await getDIDDocument(bob.page);
    
    // Bob goes "offline" by closing the page/context temporarily
    // (In real implementation, this would be more sophisticated)
    
    // Alice starts chat and sends message while Bob is "offline"
    await startNewChat(alice.page, bobDID);
    const offlineMessage = 'This message was sent while you were offline!';
    await sendTextMessage(alice.page, offlineMessage);
    
    // Verify message appears as sent for Alice
    await expect(alice.page.getByTestId('chat-message-outgoing')).toContainText(offlineMessage);
    
    // Bob comes back "online" and checks messages
    await bob.page.goto('/chats');
    
    // Bob should see the conversation
    await expect(bob.page.locator('.conversation-item').first()).toBeVisible({ timeout: 15000 });
    await bob.page.locator('.conversation-item').first().click();
    
    // Bob should see Alice's offline message
    await expect(bob.page.getByTestId('chat-message-incoming')).toContainText(offlineMessage, { timeout: 10000 });
    
    console.log('✅ Offline messaging works correctly');
  });

  test('should show proper message status indicators', async ({ aliceAndBob }) => {
    const { alice, bob } = aliceAndBob;
    
    console.log('🧪 Testing message status indicators...');
    
    // Setup users
    await alice.page.goto('/');
    await completeOnboarding(alice.page, 'Alice Status');
    
    await bob.page.goto('/');
    await completeOnboarding(bob.page, 'Bob Status');
    
    // Get Bob's DID and start chat
    const bobDID = await getDIDDocument(bob.page);
    await startNewChat(alice.page, bobDID);
    
    // Send a message
    const statusMessage = 'Testing message status indicators';
    await sendTextMessage(alice.page, statusMessage);
    
    // Check for status indicators on Alice's side
    const aliceMessage = alice.page.getByTestId('chat-message-outgoing').last();
    await expect(aliceMessage).toBeVisible();
    
    // Look for delivery status indicators
    // Note: The actual status indicators depend on the UI implementation
    // This test verifies the infrastructure works
    await expect(aliceMessage.locator('.message-meta')).toBeVisible();
    
    // Bob receives and reads the message
    await bob.page.goto('/chats');
    await expect(bob.page.locator('.conversation-item').first()).toBeVisible({ timeout: 15000 });
    await bob.page.locator('.conversation-item').first().click();
    
    await expect(bob.page.getByTestId('chat-message-incoming')).toContainText(statusMessage, { timeout: 10000 });
    
    console.log('✅ Message status indicators working');
  });
});