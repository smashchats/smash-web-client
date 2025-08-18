import { test as base } from '@playwright/test';
import { startMockSmeServer, stopMockSmeServer, SME_PORT } from '../../mocks/sme-server';
import { startMockNabServer, stopMockNabServer, NAB_PORT } from '../../mocks/nab-server';

interface ServerFixtures {
  smeServer: { port: number; url: string };
  nabServer: { port: number; url: string };
  mockServers: { sme: { port: number; url: string }; nab: { port: number; url: string } };
}

// Extend Playwright test with mock server fixtures
export const test = base.extend<ServerFixtures>({
  smeServer: async ({}, use) => {
    console.log('🚀 Starting mock SME server...');
    const server = startMockSmeServer();
    
    // Wait for server to be ready
    const maxAttempts = 30;
    let attempts = 0;
    let isReady = false;
    
    while (attempts < maxAttempts && !isReady) {
      try {
        const response = await fetch(`http://localhost:${SME_PORT}/api/health`);
        if (response.ok) {
          isReady = true;
          console.log('✅ Mock SME server ready');
        }
      } catch (error) {
        // Server not ready yet
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
    }
    
    if (!isReady) {
      throw new Error('Mock SME server failed to start within timeout');
    }
    
    const serverInfo = {
      port: server.port,
      url: `http://localhost:${server.port}/valid`,
    };
    
    await use(serverInfo);
    
    console.log('🛑 Stopping mock SME server...');
    await stopMockSmeServer();
  },

  nabServer: async ({}, use) => {
    console.log('🚀 Starting mock NAB server...');
    const server = startMockNabServer();
    
    // Wait for server to be ready
    const maxAttempts = 30;
    let attempts = 0;
    let isReady = false;
    
    while (attempts < maxAttempts && !isReady) {
      try {
        const response = await fetch(`http://localhost:${NAB_PORT}/health`);
        if (response.ok) {
          isReady = true;
          console.log('✅ Mock NAB server ready');
        }
      } catch (error) {
        // Server not ready yet
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
    }
    
    if (!isReady) {
      throw new Error('Mock NAB server failed to start within timeout');
    }
    
    const serverInfo = {
      port: server.port,
      url: `http://localhost:${server.port}`,
    };
    
    await use(serverInfo);
    
    console.log('🛑 Stopping mock NAB server...');
    await stopMockNabServer();
  },

  mockServers: async ({ smeServer, nabServer }, use) => {
    await use({
      sme: smeServer,
      nab: nabServer,
    });
  },
});

export { expect } from '@playwright/test';