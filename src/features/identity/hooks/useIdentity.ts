import type { StoredProfile } from '@src/shared/types/db';
import { logger } from '@src/shared/utils/logger';
import { useEffect, useState } from 'react';
import type { IMPeerIdentity, SMEConfigJSON, SmashUser } from 'smash-node-lib';

import {
    clearStoredIdentity,
    createSmashUser,
    importIdentity,
    loadStoredIdentity,
    storeIdentityToDB,
} from '../services/identityService';

interface IdentityState {
    identity: IMPeerIdentity | null;
    profile: StoredProfile | null;
    smeConfig: SMEConfigJSON | null;
    error: Error | null;
    isInitialized: boolean;
    smashUser: SmashUser | null;
}

export function useIdentity() {
    const [state, setState] = useState<IdentityState>({
        identity: null,
        profile: null,
        smeConfig: null,
        error: null,
        isInitialized: false,
        smashUser: null,
    });

    useEffect(() => {
        let isMounted = true;

        const loadIdentityFromStorage = async () => {
            try {
                logger.info('Loading stored identity');
                const stored = await loadStoredIdentity();

                if (!isMounted) return;
                if (stored) {
                    logger.info('Found stored identity, importing');
                    try {
                        const identity = await importIdentity(
                            stored.serialized,
                        );
                        const smashUser = await createSmashUser(
                            identity,
                            stored.smeConfig,
                        );

                        if (stored.profile) {
                            logger.debug('Updating profile', stored.profile);
                            await smashUser.updateMeta(stored.profile);
                        }

                        setState((prev) => ({
                            ...prev,
                            identity,
                            profile: stored.profile ?? null,
                            smeConfig: stored.smeConfig,
                            smashUser,
                            isInitialized: true,
                            error: null,
                        }));
                    } catch (importError) {
                        logger.error('Failed to import identity', importError);
                        await clearStoredIdentity();
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

        loadIdentityFromStorage();

        return () => {
            isMounted = false;
        };
    }, []);

    const setIdentity = async (
        identity: IMPeerIdentity,
        smeConfig: SMEConfigJSON,
        profile?: StoredProfile,
    ) => {
        try {
            logger.info('Setting up new identity');
            const smashUser = await createSmashUser(identity, smeConfig);
            await storeIdentityToDB(identity, smeConfig, profile);
            setState((prev) => ({
                ...prev,
                identity,
                smashUser,
                smeConfig,
                profile: profile ?? null,
                error: null,
            }));
            logger.info('Identity stored successfully');
        } catch (error) {
            logger.error('Failed to set identity', error);
            setState((prev) => ({ ...prev, error: error as Error }));
        }
    };

    const updateProfile = async (profile: StoredProfile) => {
        logger.debug('Updating profile', profile);
        try {
            if (state.identity && state.smeConfig) {
                await storeIdentityToDB(
                    state.identity,
                    state.smeConfig,
                    profile,
                );
                if (state.smashUser) await state.smashUser.updateMeta(profile);
                setState((prev) => ({ ...prev, profile, error: null }));
                logger.info('Profile updated successfully');
            }
        } catch (error) {
            logger.error('Failed to update profile', error);
            setState((prev) => ({ ...prev, error: error as Error }));
        }
    };

    const updateSMEConfig = async (config: SMEConfigJSON) => {
        if (!state.identity) {
            setState((s) => ({ ...s, error: new Error('No identity') }));
            return;
        }
        try {
            const smashUser = await createSmashUser(state.identity, config);
            await storeIdentityToDB(
                state.identity,
                config,
                state.profile ?? undefined,
            );
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
            await clearStoredIdentity();
            if (state.smashUser) {
                logger.debug('Closing SmashUser connections');
                await state.smashUser.close();
            }
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
                window.location.href = '/';
            }, 100);
        } catch (error) {
            logger.error('Error during logout', error);
            setState((prev) => ({ ...prev, error: error as Error }));
            window.location.href = '/';
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
