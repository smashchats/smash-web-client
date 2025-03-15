import { useEffect, useState } from 'react';
import { DIDDocManager, IMPeerIdentity, SmashUser } from 'smash-node-lib';

import { SMEConfig, StoredProfile, db } from '../db';
import { initializeSmashMessaging } from '../smash-init';
import { smashService } from '../smash-service';

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

    const [didManager] = useState(() => new DIDDocManager());

    // Load stored identity and profile from IndexedDB
    useEffect(() => {
        const loadIdentity = async () => {
            try {
                console.log('Initializing database...');
                await db.init();
                console.log('Loading stored identity...');
                const stored = await db.getIdentity();

                if (stored) {
                    console.log('Found stored identity, importing...');
                    try {
                        // Initialize SmashMessaging first
                        console.log('Initializing SmashMessaging...');
                        initializeSmashMessaging();

                        // Import the identity
                        const identity = await SmashUser.importIdentity(
                            stored.serializedIdentity,
                        );
                        console.log(
                            'Successfully imported identity:',
                            identity.did,
                        );

                        // Register the DID document
                        didManager.set(await identity.getDIDDocument());

                        // Create SmashUser instance
                        const smashUser = new SmashUser(identity);

                        // If we have SME config, configure endpoints
                        if (stored.smeConfig) {
                            console.log('Configuring endpoints...');
                            const preKeyPair =
                                await didManager.generateNewPreKeyPair(
                                    identity,
                                );
                            await smashUser.endpoints.connect(
                                stored.smeConfig,
                                preKeyPair,
                            );

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
                        console.error(
                            'Failed to import identity:',
                            importError,
                        );
                        // If import fails, clear the stored identity as it might be corrupted
                        await db.clearIdentity();
                        setState((prev) => ({
                            ...prev,
                            isInitialized: true,
                            error: importError as Error,
                        }));
                    }
                } else {
                    console.log('No stored identity found');
                    setState((prev) => ({
                        ...prev,
                        isInitialized: true,
                    }));
                }
            } catch (error) {
                console.error('Error loading identity:', error);
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
            console.log('Setting up new identity...');

            // First register the DID document
            didManager.set(await identity.getDIDDocument());

            // Create SmashUser instance
            const smashUser = new SmashUser(identity);

            // Configure endpoints with either initial config or existing state config
            const smeConfig = initialSMEConfig || state.smeConfig;
            if (smeConfig) {
                console.log('Configuring endpoints...');
                const preKeyPair =
                    await didManager.generateNewPreKeyPair(identity);
                await smashUser.endpoints.connect(smeConfig, preKeyPair);

                // Register the updated DID document with endpoints
                didManager.set(await smashUser.getDIDDocument());
            }

            // Initialize smash service
            await smashService.init(smashUser);

            // Only serialize after everything is configured
            console.log('Serializing identity...');
            const serializedIdentity = await identity.serialize();

            console.log('Storing identity in database...');
            await db.setIdentity(serializedIdentity, state.profile, smeConfig);

            setState((prev) => ({
                ...prev,
                identity,
                smashUser,
                smeConfig,
                error: null,
            }));
            console.log('Identity stored successfully');
        } catch (error) {
            console.error('Failed to set identity:', error);
            setState((prev) => ({ ...prev, error: error as Error }));
        }
    };

    const updateProfile = async (profile: StoredProfile) => {
        try {
            await db.updateProfile(profile);
            setState((prev) => ({ ...prev, profile, error: null }));

            if (state.smashUser) {
                await state.smashUser.updateMeta(profile);
            }
        } catch (error) {
            setState((prev) => ({ ...prev, error: error as Error }));
        }
    };

    const updateSMEConfig = async (config: SMEConfig) => {
        try {
            if (!state.identity) {
                throw new Error('No identity available');
            }

            // Create new SmashUser instance with fresh endpoints
            const smashUser = new SmashUser(state.identity);

            // Configure endpoints
            console.log('Configuring endpoints with new SME config...');
            const preKeyPair = await didManager.generateNewPreKeyPair(
                state.identity,
            );
            await smashUser.endpoints.connect(config, preKeyPair);

            // Register the updated DID document
            const updatedDIDDoc = await smashUser.getDIDDocument();
            console.log('Updated DID document with endpoints:', updatedDIDDoc);
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
        } catch (error) {
            console.error('Failed to update SME config:', error);
            setState((prev) => ({ ...prev, error: error as Error }));
        }
    };

    const clearIdentity = async () => {
        try {
            console.log('Cleaning up before logout...');
            
            // Close all connections and cleanup smash service
            if (state.smashUser) {
                console.log('Closing SmashUser connections...');
                await state.smashUser.close();
                console.log('Closing smash service...');
                await smashService.close();
            }

            // Make sure database is initialized before clearing
            console.log('Initializing database for cleanup...');
            await db.init();
            
            // Clear the database
            console.log('Clearing database...');
            await db.clearIdentity();
            
            // Close database connection
            console.log('Closing database connection...');
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
            console.log('Refreshing page...');
            window.location.reload();
        } catch (error) {
            console.error('Error during logout:', error);
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
