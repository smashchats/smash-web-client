import { getDIDDocManager } from '@services/didDocService';
import { SmashMessaging } from 'smash-node-lib';

let isInitialized = false;

export function initializeSmashEnvironment(): void {
    if (isInitialized) return;
    // Setup WebCrypto
    const crypto = window.crypto || new Crypto();
    SmashMessaging.setCrypto(crypto);

    // Setup DID manager
    const didManager = getDIDDocManager();
    // eslint-disable-next-line react-hooks/rules-of-hooks
    SmashMessaging.use(didManager);

    isInitialized = true;
}
