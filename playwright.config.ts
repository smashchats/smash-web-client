import { devices, defineConfig } from '@playwright/test';

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests/e2e',
  
  /* Run tests in files in parallel */
  fullyParallel: true,
  
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 1,
  
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,

  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html'],
    ['json', { outputFile: 'playwright-report/results.json' }],
    ['junit', { outputFile: 'playwright-report/results.xml' }]
  ],

  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    
    /* Keep videos for failed tests */
    video: 'retain-on-failure',
    
    /* Screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Extend timeout for expectations */
    expect: {
      timeout: 10_000,
    },
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium-mobile',
      use: { 
        ...devices['Pixel 7'],
        launchOptions: {
          args: [
            '--use-fake-ui-for-media-stream',
            '--use-fake-device-for-media-stream',
            '--disable-web-security', // For CORS in development
            '--disable-features=VizDisplayCompositor', // Helps with stability
          ],
        },
      },
    },

    {
      name: 'webkit-ui',
      use: { 
        ...devices['Desktop Safari'],
        launchOptions: {
          args: [
            '--disable-web-security',
          ],
        },
      },
    },

    {
      name: 'firefox-ui',
      use: { 
        ...devices['Desktop Firefox'],
        launchOptions: {
          firefoxUserPrefs: {
            'media.navigator.streams.fake': true,
            'media.navigator.permission.disabled': true,
          },
        },
      },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: process.env.CI ? undefined : {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000, // 2 minutes
  },

  /* Global timeout for each test */
  timeout: 30 * 1000,

  /* Expect timeout */
  expect: {
    timeout: 10_000,
  },
});