import type { StoredProfile } from '@shared/types/db';
import { createContext } from 'react';
import type { IMPeerIdentity, SMEConfigJSON, SmashUser } from 'smash-node-lib';

export interface IdentityContextValue {
    // State
    identity: IMPeerIdentity | null;
    smashUser: SmashUser | null;
    profile: StoredProfile | null;
    smeConfig: SMEConfigJSON | null;
    error: Error | null;
    isInitialized: boolean;

    // Actions
    setIdentity: (
        identity: IMPeerIdentity,
        smeConfig: SMEConfigJSON,
        profile?: StoredProfile,
    ) => Promise<void>;
    updateProfile: (profile: StoredProfile) => Promise<void>;
    updateSMEConfig: (config: SMEConfigJSON) => Promise<void>;
    clearIdentity: () => Promise<void>;
}

export const IdentityContext = createContext<IdentityContextValue | null>(null);
