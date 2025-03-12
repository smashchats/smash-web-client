import { useEffect, useState } from 'react';
import { DIDDocManager, IMPeerIdentity, SmashUser } from 'smash-node-lib';

import { smashService } from '../smash-service';

// Local storage keys
const IDENTITY_KEY = 'smash_identity';
const PROFILE_KEY = 'smash_profile';
const SME_CONFIG_KEY = 'sme_config';

interface Profile {
    title: string;
    description: string;
    avatar: string;
}

interface SMEConfig {
    url: string;
    smePublicKey: string;
}

interface SmashIdentityState {
    identity: IMPeerIdentity | null;
    profile: Profile | null;
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

    // Load stored identity and profile
    useEffect(() => {
        try {
            const storedIdentity = localStorage.getItem(IDENTITY_KEY);
            const storedProfile = localStorage.getItem(PROFILE_KEY);
            const storedSMEConfig = localStorage.getItem(SME_CONFIG_KEY);

            setState((prev) => ({
                ...prev,
                identity: storedIdentity ? JSON.parse(storedIdentity) : null,
                profile: storedProfile ? JSON.parse(storedProfile) : null,
                smeConfig: storedSMEConfig ? JSON.parse(storedSMEConfig) : null,
                isInitialized: true,
            }));
        } catch (error) {
            setState((prev) => ({
                ...prev,
                error: error as Error,
                isInitialized: true,
            }));
        }
    }, []);

    // Initialize Smash user when identity and SME config are available
    useEffect(() => {
        const initSmashUser = async () => {
            if (!state.identity || !state.smeConfig || state.smashUser) return;

            try {
                // Generate new pre-key pair
                await didManager.generateNewPreKeyPair(state.identity);

                // Initialize Smash user
                const smashUser = new SmashUser(state.identity);
                const preKeyPair = await didManager.generateNewPreKeyPair(
                    state.identity,
                );
                await smashUser.endpoints.connect(state.smeConfig, preKeyPair);

                // Initialize smash service
                await smashService.init(smashUser);

                // Update profile metadata if available
                if (state.profile) {
                    await smashUser.updateMeta({
                        title: state.profile.title,
                        description: state.profile.description,
                        avatar: state.profile.avatar,
                    });
                }

                setState((prev) => ({ ...prev, smashUser, error: null }));
            } catch (error) {
                setState((prev) => ({ ...prev, error: error as Error }));
            }
        };

        initSmashUser();
    }, [
        state.identity,
        state.smeConfig,
        state.smashUser,
        state.profile,
        didManager,
    ]);

    const setIdentity = async (identity: IMPeerIdentity) => {
        try {
            localStorage.setItem(IDENTITY_KEY, JSON.stringify(identity));
            setState((prev) => ({ ...prev, identity, error: null }));
        } catch (error) {
            setState((prev) => ({ ...prev, error: error as Error }));
        }
    };

    const updateProfile = async (profile: Profile) => {
        try {
            localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
            setState((prev) => ({ ...prev, profile, error: null }));

            if (state.smashUser) {
                await state.smashUser.updateMeta({
                    title: profile.title,
                    description: profile.description,
                    avatar: profile.avatar,
                });
            }
        } catch (error) {
            setState((prev) => ({ ...prev, error: error as Error }));
        }
    };

    const updateSMEConfig = async (config: SMEConfig) => {
        try {
            localStorage.setItem(SME_CONFIG_KEY, JSON.stringify(config));
            setState((prev) => ({ ...prev, smeConfig: config, error: null }));
        } catch (error) {
            setState((prev) => ({ ...prev, error: error as Error }));
        }
    };

    const clearIdentity = async () => {
        try {
            if (state.smashUser) {
                await state.smashUser.close();
                await smashService.close();
            }

            localStorage.removeItem(IDENTITY_KEY);
            localStorage.removeItem(PROFILE_KEY);
            localStorage.removeItem(SME_CONFIG_KEY);

            setState({
                identity: null,
                profile: null,
                smeConfig: null,
                error: null,
                isInitialized: true,
                smashUser: null,
            });
        } catch (error) {
            setState((prev) => ({ ...prev, error: error as Error }));
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
