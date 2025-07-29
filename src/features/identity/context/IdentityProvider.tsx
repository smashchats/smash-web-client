import type { StoredProfile } from '@shared/types/db';
import { logger } from '@shared/utils/logger';
import { useState } from 'react';
import type { IMPeerIdentity, SMEConfigJSON, SmashUser } from 'smash-node-lib';

import { createSmashUser, persistIdentity } from '../services/identityService';
import { clearStoredIdentity } from '../services/identityStorage';
import { IdentityContext, type IdentityContextValue } from './IdentityContext';

interface IdentityProviderProps {
    children: React.ReactNode;
    identity: IMPeerIdentity | null;
    smashUser: SmashUser | null;
    profile: StoredProfile | null;
    smeConfig: SMEConfigJSON | null;
    error: Error | null;
}

export function IdentityProvider({
    children,
    identity: initialIdentity,
    smashUser: initialSmashUser,
    profile: initialProfile,
    smeConfig: initialSmeConfig,
    error: initialError,
}: IdentityProviderProps) {
    const [state, setState] = useState({
        identity: initialIdentity,
        smashUser: initialSmashUser,
        profile: initialProfile,
        smeConfig: initialSmeConfig,
        error: initialError,
    });

    const setIdentity = async (
        identity: IMPeerIdentity,
        smeConfig: SMEConfigJSON,
        profile?: StoredProfile,
    ) => {
        try {
            logger.info('Setting up new identity');
            const smashUser = await createSmashUser(identity, smeConfig);
            await persistIdentity(identity, smeConfig, profile);
            setState({
                identity,
                smashUser,
                smeConfig,
                profile: profile ?? null,
                error: null,
            });
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
                await persistIdentity(state.identity, state.smeConfig, profile);
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
            await persistIdentity(
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

    const contextValue: IdentityContextValue = {
        identity: state.identity,
        smashUser: state.smashUser,
        profile: state.profile,
        smeConfig: state.smeConfig,
        error: state.error,
        isInitialized: true, // Always initialized since we're providing the state
        setIdentity,
        updateProfile,
        updateSMEConfig,
        clearIdentity,
    };

    return (
        <IdentityContext.Provider value={contextValue}>
            {children}
        </IdentityContext.Provider>
    );
}
