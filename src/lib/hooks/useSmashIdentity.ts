import { useEffect, useState } from 'react';
import { IMPeerIdentity, SmashUser } from 'smash-node-lib';

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

export function useSmashIdentity() {
    const [state, setState] = useState<SmashIdentityState>({
        identity: null,
        profile: null,
        smeConfig: null,
        error: null,
        isInitialized: false,
        smashUser: null,
    });

    // Load stored identity and profile from IndexedDB
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
                        // Initialize SmashMessaging first
                        logger.debug('Initializing SmashMessaging');
                        initializeSmashMessaging();
                        const didManager = getDidDocumentManager();

                        // Import the identity
                        const identity = await SmashUser.importIdentity(
                            stored.serializedIdentity,
                        );
                        logger.info('Successfully imported identity', {
                            did: identity.did,
                        });

                        // Register the DID document
                        didManager.set(await identity.getDIDDocument());

                        // Create SmashUser instance
                        const smashUser = new SmashUser(identity);

                        // If we have SME config, configure endpoints
                        if (stored.smeConfig) {
                            logger.debug('Configuring endpoints');
                            const preKeyPair = identity.signedPreKeys[0];
                            if (!preKeyPair) {
                                throw new Error(
                                    'No PreKeyPair found in identity',
                                );
                            }
                            await smashUser.endpoints.reset([stored.smeConfig]);

                            // Register the updated DID document with endpoints
                            didManager.set(await smashUser.getDIDDocument());
                        }

                        // Initialize smash service
                        await smashService.init(smashUser);

                        // Update profile metadata if available
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
                        // If import fails, clear the stored identity as it might be corrupted
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
            const didManager = getDidDocumentManager();

            // First register the DID document
            didManager.set(await identity.getDIDDocument());

            // Create SmashUser instance
            const smashUser = new SmashUser(identity);

            // Configure endpoints with either initial config or existing state config
            const smeConfig = initialSMEConfig || state.smeConfig;
            if (smeConfig) {
                logger.debug('Configuring endpoints');
                // Generate a new PreKeyPair for the identity
                const preKeyPair =
                    await didManager.generateNewPreKeyPair(identity);
                logger.debug('Generated new PreKeyPair for identity');
                const endpoint = await smashUser.endpoints.connect(
                    smeConfig,
                    preKeyPair,
                );
                logger.debug('Connected to endpoint', endpoint);
                // Register the updated DID document with endpoints
                didManager.set(await smashUser.getDIDDocument());
            }

            // Initialize smash service
            await smashService.init(smashUser);

            // Only serialize after everything is configured
            logger.debug('Serializing identity');
            const serializedIdentity = await identity.serialize();

            logger.debug('Storing identity in database');
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
            const didManager = getDidDocumentManager();

            // Create new SmashUser instance with fresh endpoints
            const smashUser = new SmashUser(state.identity);

            // Configure endpoints
            logger.debug('Configuring endpoints with new SME config');
            const preKeyPair = state.identity.signedPreKeys[0];
            if (!preKeyPair) {
                throw new Error('No PreKeyPair found in identity');
            }
            await smashUser.endpoints.reset([config]);

            // Register the updated DID document
            const updatedDIDDoc = await smashUser.getDIDDocument();
            logger.debug('Updated DID document with endpoints', {
                did: updatedDIDDoc.id,
            });
            didManager.set(updatedDIDDoc);

            // Initialize smash service with new instance
            await smashService.init(smashUser);

            // Serialize and store after configuration
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

            // Close all connections and cleanup smash service
            if (state.smashUser) {
                logger.debug('Closing SmashUser connections');
                await state.smashUser.close();
                logger.debug('Closing smash service');
                await smashService.close();
            }

            // Make sure database is initialized before clearing
            logger.debug('Initializing database for cleanup');
            await db.init();

            // Clear the database
            logger.debug('Clearing database');
            await db.clearIdentity();

            // Close database connection
            logger.debug('Closing database connection');
            await db.close();

            // Reset state
            setState({
                identity: null,
                profile: null,
                smeConfig: null,
                error: null,
                isInitialized: true,
                smashUser: null,
            });

            // Force a page refresh to ensure clean slate
            logger.info('Refreshing page');
            window.location.reload();
        } catch (error) {
            logger.error('Error during logout', error);
            setState((prev) => ({ ...prev, error: error as Error }));
            // Still try to refresh the page even if there was an error
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
