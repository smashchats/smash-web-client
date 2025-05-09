import { createContext, useContext } from 'react';
import { type IMPeerIdentity, type SmashUser } from 'smash-node-lib';

import { type Profile, type SMEConfig } from '../types/smash';

interface SmashContextValue {
    identity: IMPeerIdentity | null;
    smashUser: SmashUser | null;
    isInitialized: boolean;
    profile: Profile | null;
    smeConfig: SMEConfig | null;
    error: Error | null;
    setIdentity: (
        identity: IMPeerIdentity,
        smeConfig?: SMEConfig,
    ) => Promise<void>;
    clearIdentity: () => Promise<void>;
    updateProfile: (profile: Profile) => Promise<void>;
    updateSMEConfig: (config: SMEConfig) => Promise<void>;
}

export const SmashContext = createContext<SmashContextValue | undefined>(
    undefined,
);

export function useSmash() {
    const context = useContext(SmashContext);
    if (!context) {
        throw new Error('useSmash must be used within SmashProvider');
    }
    return context;
}
