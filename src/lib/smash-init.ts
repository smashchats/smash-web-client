import { Crypto } from '@peculiar/webcrypto';
import {
    DIDDocManager,
    IIMPeerIdentity,
    IMPeerIdentity,
    SmashMessaging,
} from 'smash-node-lib';

// Initialize DID document manager globally
let didDocumentManager: DIDDocManager | null = null;

export function initializeSmashMessaging() {
    console.log('Initializing Smash messaging...');
    if (!didDocumentManager) {
        try {
            // Use native WebCrypto if available, otherwise use polyfill
            const crypto = window.crypto || new Crypto();
            console.log('Setting up WebCrypto...');
            SmashMessaging.setCrypto(crypto);
            console.log('WebCrypto initialized successfully');

            console.log('Creating DID document manager...');
            didDocumentManager = new DIDDocManager();
            console.log('DID document manager created successfully');

            console.log('Configuring Smash messaging with DID manager...');
            // This is not actually a React Hook, it's just a method name
            // eslint-disable-next-line react-hooks/rules-of-hooks
            SmashMessaging.use(didDocumentManager);
            console.log('Smash messaging configured successfully');
        } catch (err) {
            console.error('Error during Smash initialization:', err);
            throw err;
        }
    } else {
        console.log('Smash messaging already initialized');
    }
    return didDocumentManager;
}

export async function generateIdentity(): Promise<IMPeerIdentity> {
    const manager = initializeSmashMessaging();
    return manager.generate();
}

export async function importIdentity(
    serializedIdentity: IIMPeerIdentity,
): Promise<IMPeerIdentity> {
    initializeSmashMessaging();
    return SmashMessaging.importIdentity(serializedIdentity);
}

export function getDidDocumentManager(): DIDDocManager {
    if (!didDocumentManager) {
        throw new Error('Smash messaging not initialized');
    }
    return didDocumentManager;
}
