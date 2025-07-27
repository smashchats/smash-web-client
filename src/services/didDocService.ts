import { DIDDocManager } from 'smash-node-lib';

let didDocManager: DIDDocManager | null = null;

export function getDIDDocManager() {
    if (!didDocManager) {
        didDocManager = new DIDDocManager();
    }
    return didDocManager;
}
