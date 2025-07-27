import { db } from '@src/services/db';
import { getDIDDocManager } from '@src/services/didDocService';
import type { StoredProfile } from '@src/shared/types/db';
import { logger } from '@src/shared/utils/logger';
import {
    type IIMPeerIdentity,
    type IMPeerIdentity,
    type SMEConfigJSON,
    SmashMessaging,
    SmashUser,
} from 'smash-node-lib';

export async function generateIdentity(): Promise<IMPeerIdentity> {
    logger.info('Generating new identity');
    const manager = getDIDDocManager();
    const identity = await manager.generate();

    // Generate and add a PreKeyPair to the identity
    const preKeyPair = await manager.generateNewPreKeyPair(identity);
    identity.addPreKeyPair(preKeyPair);

    logger.info('Identity generated successfully', { did: identity.did });
    return identity;
}

export async function importIdentity(
    serialized: string,
): Promise<IMPeerIdentity> {
    logger.info('Importing identity');
    const identity = await SmashMessaging.importIdentity(
        JSON.parse(serialized) as IIMPeerIdentity,
    );
    return identity;
}

export async function createSmashUser(
    identity: IMPeerIdentity,
    smeConfig: SMEConfigJSON,
): Promise<SmashUser> {
    const didManager = getDIDDocManager();
    didManager.set(await identity.getDIDDocument());
    const smashUser = new SmashUser(identity, 'webclient', 'DEBUG');
    if (smeConfig) {
        // Convert SMEConfigJSON to SMEConfig by adding preKeyPair
        if (!identity.signedPreKeys || !identity.signedPreKeys[0]) {
            throw new Error('Identity must have signed prekeys');
        }
        const fullSmeConfig: import('smash-node-lib').SMEConfig = {
            ...smeConfig,
            preKeyPair: identity.signedPreKeys[0],
        };
        await smashUser.endpoints.connect(
            fullSmeConfig,
            fullSmeConfig.preKeyPair,
        );
        didManager.set(await smashUser.getDIDDocument());
    }
    return smashUser;
}

export async function persistIdentity(
    identity: IMPeerIdentity,
    smeConfig: SMEConfigJSON,
    profile?: StoredProfile,
): Promise<void> {
    const serializedIdentity = JSON.stringify(await identity.serialize());
    await db.identity.put({
        id: 'current',
        serialized: serializedIdentity,
        smeConfig,
        profile,
        createdAt: Date.now(),
        lastUsedAt: Date.now(),
    });
}
