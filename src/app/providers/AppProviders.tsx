import { IdentityProvider } from '@features/identity';
import type { StoredProfile } from '@shared/types/db';
import React from 'react';
import type { IMPeerIdentity, SMEConfigJSON, SmashUser } from 'smash-node-lib';

interface AppProvidersProps {
    children: React.ReactNode;
    identity: IMPeerIdentity | null;
    smashUser: SmashUser | null;
    profile: StoredProfile | null;
    smeConfig: SMEConfigJSON | null;
    error: Error | null;
}

export function AppProviders({
    children,
    identity,
    smashUser,
    profile,
    smeConfig,
    error,
}: AppProvidersProps) {
    return (
        <IdentityProvider
            identity={identity}
            smashUser={smashUser}
            profile={profile}
            smeConfig={smeConfig}
            error={error}
        >
            {/* Add ThemeProvider, MessagingProvider, etc. here as needed */}
            {children}
        </IdentityProvider>
    );
}
