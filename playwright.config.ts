import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
    testDir: './tests',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: 'list',
    globalSetup: path.resolve(__dirname, './tests/global-setup.ts'),
    globalTeardown: path.resolve(__dirname, './tests/global-teardown.ts'),
    use: {
        baseURL: 'http://localhost:5173',
        trace: 'on-first-retry',
        actionTimeout: 5000,
        navigationTimeout: 5000,
    },
    timeout: 10000,
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
    webServer: {
        command: 'npm run dev -- --mode test',
        url: 'http://localhost:5173',
        reuseExistingServer: !process.env.CI,
    },
});
