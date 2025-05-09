import { Crypto } from '@peculiar/webcrypto';
import {
    DIDDocManager,
    type IIMPeerIdentity,
    type IMPeerIdentity,
    SmashMessaging,
} from 'smash-node-lib';

import { logger } from '../logger';

// Initialize DID document manager globally
let didDocumentManager: DIDDocManager | null = null;

export function initializeSmashMessaging() {
    logger.info('Initializing Smash messaging');
    if (!didDocumentManager) {
        try {
            // Use native WebCrypto if available, otherwise use polyfill
            const crypto = window.crypto || new Crypto();
            logger.debug('Setting up WebCrypto');
            SmashMessaging.setCrypto(crypto);
            logger.debug('WebCrypto initialized successfully');

            logger.debug('Creating DID document manager');
            didDocumentManager = new DIDDocManager();
            logger.debug('DID document manager created successfully');

            logger.debug('Configuring Smash messaging with DID manager');
            // This is not actually a React Hook, it's just a method name
            // eslint-disable-next-line react-hooks/rules-of-hooks
            SmashMessaging.use(didDocumentManager);
            logger.info('Smash messaging initialized successfully');
        } catch (err) {
            logger.error('Error during Smash initialization', err);
            throw err;
        }
    } else {
        logger.debug('Smash messaging already initialized');
    }
    return didDocumentManager;
}

export async function generateIdentity(): Promise<IMPeerIdentity> {
    logger.info('Generating new identity');
    const manager = initializeSmashMessaging();
    const identity = await manager.generate();

    // Generate and add a PreKeyPair to the identity
    const preKeyPair = await manager.generateNewPreKeyPair(identity);
    identity.addPreKeyPair(preKeyPair);

    logger.info('Identity generated successfully', { did: identity.did });
    return identity;
}

export async function importIdentity(
    serializedIdentity: IIMPeerIdentity,
): Promise<IMPeerIdentity> {
    logger.info('Importing identity');
    initializeSmashMessaging();
    const identity = await SmashMessaging.importIdentity(serializedIdentity);
    logger.info('Identity imported successfully', { did: identity.did });
    return identity;
}

export function getDidDocumentManager(): DIDDocManager {
    if (!didDocumentManager) {
        logger.error('Smash messaging not initialized');
        throw new Error('Smash messaging not initialized');
    }
    return didDocumentManager;
}
