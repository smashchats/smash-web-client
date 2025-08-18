#!/usr/bin/env tsx

import { startMockSmeServer, stopMockSmeServer } from './sme-server.js';
import { startMockNabServer, stopMockNabServer } from './nab-server.js';

let smeServer: any;
let nabServer: any;

async function startMockServers() {
    console.log('🚀 Starting mock servers for E2E testing...');
    
    try {
        // Start SME server
        smeServer = startMockSmeServer();
        console.log(`✅ Mock SME server running on port ${smeServer.port}`);
        
        // Start NAB server  
        nabServer = startMockNabServer();
        console.log(`✅ Mock NAB server running on port ${nabServer.port}`);
        
        console.log('\n📡 Mock servers ready for E2E testing!');
        console.log('Press Ctrl+C to stop servers\n');
        
    } catch (error) {
        console.error('❌ Failed to start mock servers:', error);
        process.exit(1);
    }
}

async function stopMockServers() {
    console.log('\n🛑 Stopping mock servers...');
    
    try {
        if (smeServer) {
            await stopMockSmeServer();
            console.log('✅ Mock SME server stopped');
        }
        
        if (nabServer) {
            await stopMockNabServer();
            console.log('✅ Mock NAB server stopped');
        }
        
        console.log('👋 Mock servers stopped successfully');
    } catch (error) {
        console.error('❌ Error stopping mock servers:', error);
    }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    await stopMockServers();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await stopMockServers();
    process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', async (error) => {
    console.error('❌ Uncaught exception:', error);
    await stopMockServers();
    process.exit(1);
});

process.on('unhandledRejection', async (reason, promise) => {
    console.error('❌ Unhandled rejection at:', promise, 'reason:', reason);
    await stopMockServers();
    process.exit(1);
});

// Start the servers
startMockServers();