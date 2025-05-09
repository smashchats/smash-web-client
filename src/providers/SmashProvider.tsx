import { type ReactNode, useEffect, useMemo, useState } from 'react';

import { peerController } from '../controllers/peerController';
import { useSmashIdentity } from '../lib/hooks/useSmashIdentity';
import { SmashContext } from './SmashContext';

// Define what's exposed through the context

// Create context

// Provider component
export function SmashProvider({
    children,
}: Readonly<{
    children: ReactNode;
}>) {
    const {
        identity,
        smashUser,
        isInitialized,
        profile,
        smeConfig,
        error,
        setIdentity,
        clearIdentity,
        updateProfile,
        updateSMEConfig,
    } = useSmashIdentity();

    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        if (isInitialized) {
            (async () => {
                await peerController.initAllPeers();
                setIsReady(true);
            })();
        }
    }, [isInitialized]);

    const value = useMemo(
        () => ({
            identity,
            smashUser,
            isInitialized,
            profile,
            smeConfig,
            error,
            setIdentity,
            clearIdentity,
            updateProfile,
            updateSMEConfig,
        }),
        [
            identity,
            smashUser,
            isInitialized,
            profile,
            smeConfig,
            error,
            setIdentity,
            clearIdentity,
            updateProfile,
            updateSMEConfig,
        ],
    );

    if (!isReady) {
        return <div className="loading-screen">Loading identity...</div>;
    }

    return (
        <SmashContext.Provider value={value}>{children}</SmashContext.Provider>
    );
}
