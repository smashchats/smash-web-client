import { useEffect, useState } from 'react';
import { DID, IMPeerIdentity, SmashUser } from 'smash-node-lib';

import { SMEConfig, StoredProfile, db } from '../db';
import { logger } from '../logger';
import {
    getDidDocumentManager,
    initializeSmashMessaging,
} from '../smash/smash-init';
import { smashService } from '../smash/smash-service';

interface SmashIdentityState {
    identity: IMPeerIdentity | null;
    profile: StoredProfile | null;
    smeConfig: SMEConfig | null;
    error: Error | null;
    isInitialized: boolean;
    smashUser: SmashUser | null;
}

const initializeSmashUser = async (
    identity: IMPeerIdentity,
    smeConfig: SMEConfig | null,
) => {
    const didManager = getDidDocumentManager();
    didManager.set(await identity.getDIDDocument());

    const smashUser = new SmashUser(identity);

    if (smeConfig) {
        logger.debug('Configuring endpoints');
        const preKeyPair = identity.signedPreKeys[0];
        if (!preKeyPair) {
            throw new Error('No PreKeyPair found in identity');
        }
        await smashUser.endpoints.reset([smeConfig]);
        didManager.set(await smashUser.getDIDDocument());
    }

    await smashService.init(smashUser);

    return smashUser;
};

const initializeChats = async (smashUser: SmashUser) => {
    logger.debug('Initializing chats with existing conversations');
    const conversations = await db.getConversations();
    const resetTime = new Date(0).toISOString();
    await smashUser.initChats(
        conversations.map((conv) => ({
            with: conv.id as DID,
            lastMessageTimestamp: resetTime,
        })),
    );
};

export function useSmashIdentity() {
    const [state, setState] = useState<SmashIdentityState>({
        identity: null,
        profile: null,
        smeConfig: null,
        error: null,
        isInitialized: false,
        smashUser: null,
    });

    useEffect(() => {
        const loadIdentity = async () => {
            try {
                logger.info('Initializing database');
                await db.init();
                logger.debug('Loading stored identity');
                const stored = await db.getIdentity();

                if (stored) {
                    logger.info('Found stored identity, importing');
                    try {
                        initializeSmashMessaging();

                        const identity = await SmashUser.importIdentity(
                            stored.serializedIdentity,
                        );
                        logger.info('Successfully imported identity', {
                            did: identity.did,
                        });

                        const smashUser = await initializeSmashUser(
                            identity,
                            stored.smeConfig,
                        );
                        await initializeChats(smashUser);

                        if (stored.profile) {
                            await smashUser.updateMeta(stored.profile);
                        }

                        setState((prev) => ({
                            ...prev,
                            identity,
                            profile: stored.profile,
                            smeConfig: stored.smeConfig,
                            smashUser,
                            isInitialized: true,
                            error: null,
                        }));
                    } catch (importError) {
                        logger.error('Failed to import identity', importError);
                        await db.clearIdentity();
                        setState((prev) => ({
                            ...prev,
                            isInitialized: true,
                            error: importError as Error,
                        }));
                    }
                } else {
                    logger.debug('No stored identity found');
                    setState((prev) => ({
                        ...prev,
                        isInitialized: true,
                    }));
                }
            } catch (error) {
                logger.error('Error loading identity', error);
                setState((prev) => ({
                    ...prev,
                    error: error as Error,
                    isInitialized: true,
                }));
            }
        };

        loadIdentity();
    }, []);

    const setIdentity = async (
        identity: IMPeerIdentity,
        initialSMEConfig?: SMEConfig,
    ) => {
        try {
            logger.info('Setting up new identity');
            const smeConfig = initialSMEConfig || state.smeConfig;

            const smashUser = await initializeSmashUser(identity, smeConfig);
            await initializeChats(smashUser);

            const serializedIdentity = await identity.serialize();
            await db.setIdentity(serializedIdentity, state.profile, smeConfig);

            setState((prev) => ({
                ...prev,
                identity,
                smashUser,
                smeConfig,
                error: null,
            }));
            logger.info('Identity stored successfully');
        } catch (error) {
            logger.error('Failed to set identity', error);
            setState((prev) => ({ ...prev, error: error as Error }));
        }
    };

    const updateProfile = async (profile: StoredProfile) => {
        try {
            logger.debug('Updating profile');
            await db.updateProfile(profile);
            setState((prev) => ({ ...prev, profile, error: null }));

            if (state.smashUser) {
                await state.smashUser.updateMeta(profile);
            }
            logger.info('Profile updated successfully');
        } catch (error) {
            logger.error('Failed to update profile', error);
            setState((prev) => ({ ...prev, error: error as Error }));
        }
    };

    const updateSMEConfig = async (config: SMEConfig) => {
        try {
            if (!state.identity) {
                throw new Error('No identity available');
            }

            const smashUser = await initializeSmashUser(state.identity, config);
            await initializeChats(smashUser);

            const serializedIdentity = await state.identity.serialize();
            await db.setIdentity(serializedIdentity, state.profile, config);

            setState((prev) => ({
                ...prev,
                smeConfig: config,
                smashUser,
                error: null,
            }));
            logger.info('SME config updated successfully');
        } catch (error) {
            logger.error('Failed to update SME config', error);
            setState((prev) => ({ ...prev, error: error as Error }));
        }
    };

    const clearIdentity = async () => {
        try {
            logger.info('Cleaning up before logout');

            if (state.smashUser) {
                logger.debug('Closing SmashUser connections');
                await state.smashUser.close();
                logger.debug('Closing smash service');
                await smashService.close();
            }

            await db.init();
            await db.clearIdentity();
            await db.deleteDatabase();

            setState({
                identity: null,
                profile: null,
                smeConfig: null,
                error: null,
                isInitialized: true,
                smashUser: null,
            });

            logger.info('Refreshing page');
            setTimeout(() => {
                window.location.reload();
            }, 100);
        } catch (error) {
            logger.error('Error during logout', error);
            setState((prev) => ({ ...prev, error: error as Error }));
            window.location.reload();
        }
    };

    return {
        identity: state.identity,
        profile: state.profile,
        smeConfig: state.smeConfig,
        error: state.error,
        isInitialized: state.isInitialized,
        smashUser: state.smashUser,
        setIdentity,
        updateProfile,
        updateSMEConfig,
        clearIdentity,
    };
}
