import { test as baseTest, expect, type Page, type BrowserContext } from '@playwright/test';
import { test as serverTest } from './servers';

interface UserFixtures {
  alice: UserContext;
  bob: UserContext;
  aliceAndBob: {
    alice: UserContext;
    bob: UserContext;
  };
}

interface UserContext {
  page: Page;
  context: BrowserContext;
  did?: string;
}

// Environment variables for test mode
const TEST_ENV = {
  VITE_TEST_MODE: 'true',
  VITE_DISABLE_SW: 'true',
  VITE_TEST_TRANSPORT: 'relay',
  VITE_SME_URL: 'http://localhost:12345/valid',
  VITE_SME_PUBLIC_KEY: 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEg6rwXUOg3N18rZlQRS8sCmKGuB4opGtTXvYi7DkXltVzK0rEVd91HgM7L9YEyTsM9ntJ8Ye+rHey0LiUZwFwAw==',
  VITE_NAB_URL: 'http://localhost:12346',
};

export const test = serverTest.extend<UserFixtures>({
  alice: async ({ browser, mockServers }, use) => {
    console.log('🧪 Setting up Alice\'s context...');
    
    // Create isolated context for Alice
    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
      permissions: ['camera', 'microphone'],
      // Add test environment variables via localStorage injection
    });
    
    const page = await context.newPage();
    
    // Set test environment variables
    await page.addInitScript((env) => {
      Object.entries(env).forEach(([key, value]) => {
        localStorage.setItem(`__env_${key}`, value);
      });
    }, TEST_ENV);
    
    // Create user context
    const userContext: UserContext = {
      page,
      context,
    };
    
    await use(userContext);
    
    await context.close();
  },

  bob: async ({ browser, mockServers }, use) => {
    console.log('🧪 Setting up Bob\'s context...');
    
    // Create isolated context for Bob
    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
      permissions: ['camera', 'microphone'],
    });
    
    const page = await context.newPage();
    
    // Set test environment variables
    await page.addInitScript((env) => {
      Object.entries(env).forEach(([key, value]) => {
        localStorage.setItem(`__env_${key}`, value);
      });
    }, TEST_ENV);
    
    // Create user context
    const userContext: UserContext = {
      page,
      context,
    };
    
    await use(userContext);
    
    await context.close();
  },

  aliceAndBob: async ({ alice, bob }, use) => {
    await use({
      alice,
      bob,
    });
  },
});

/**
 * Helper function to complete the onboarding flow for a user
 */
export async function completeOnboarding(page: Page, displayName: string) {
  console.log(`📝 Completing onboarding for ${displayName}...`);
  
  // Navigate to welcome page if not already there
  await page.goto('/welcome');
  
  // Wait for welcome screen to load
  await expect(page.getByTestId('welcome-get-started')).toBeVisible();
  
  // Click "Get Started"
  await page.getByTestId('welcome-get-started').click();
  
  // Fill in display name
  await page.getByTestId('welcome-display-name-input').fill(displayName);
  
  // Click "Create Identity"
  await page.getByTestId('welcome-create-identity').click();
  
  // Wait for onboarding to complete and navigation to chats
  await expect(page).toHaveURL('/chats');
  await expect(page.getByTestId('nav-chats', { timeout: 15000 })).toBeVisible();
  
  console.log(`✅ ${displayName} onboarding completed`);
}

/**
 * Helper function to navigate to settings and get DID document
 */
export async function getDIDDocument(page: Page): Promise<string> {
  console.log('📄 Getting DID document from settings...');
  
  // Navigate to profile/settings
  await page.goto('/profile');
  
  // Wait for DID document section to load
  await expect(page.getByTestId('copy-did-document')).toBeVisible();
  
  // Set up clipboard interception
  let didDocument = '';
  
  // Handle clipboard write
  await page.context().grantPermissions(['clipboard-write', 'clipboard-read']);
  
  // Click copy DID document
  await page.getByTestId('copy-did-document').click();
  
  // Wait for copy confirmation
  await expect(page.getByText('Copied!')).toBeVisible();
  
  // Get the DID document from clipboard
  didDocument = await page.evaluate(async () => {
    return await navigator.clipboard.readText();
  });
  
  console.log('✅ DID document retrieved');
  return didDocument;
}

/**
 * Helper function to start a new chat with a DID document
 */
export async function startNewChat(page: Page, didDocument: string) {
  console.log('💬 Starting new chat...');
  
  // Go to chats if not already there
  await page.goto('/chats');
  
  // Open new chat dialog
  await page.getByTestId('new-chat-trigger').click();
  
  // Wait for dialog to open
  await expect(page.getByTestId('new-chat-did-input')).toBeVisible();
  
  // Paste DID document
  await page.getByTestId('new-chat-did-input').fill(didDocument);
  
  // Start chat
  await page.getByTestId('new-chat-start').click();
  
  // Wait for chat to open
  await expect(page.url()).toMatch(/\/chat\//);
  
  console.log('✅ New chat started');
}

/**
 * Helper function to send a text message
 */
export async function sendTextMessage(page: Page, message: string) {
  console.log(`📤 Sending message: "${message}"`);
  
  // Wait for chat input to be visible
  await expect(page.getByTestId('chat-input')).toBeVisible();
  
  // Type message
  await page.getByTestId('chat-input').fill(message);
  
  // Send message
  await page.getByTestId('chat-send-button').click();
  
  // Wait for message to appear
  await expect(page.getByTestId('chat-message-outgoing')).toContainText(message);
  
  console.log('✅ Message sent');
}

export { expect };