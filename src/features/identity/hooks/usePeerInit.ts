import { peerService } from '@services/peerService';
import { logger } from '@shared/utils/logger';
import { useEffect, useState } from 'react';
import type { IMPeerIdentity } from 'smash-node-lib';

interface PeerInitState {
    isInitialized: boolean;
    error: Error | null;
}

export function usePeerInit(
    identity: IMPeerIdentity | null,
    isMessagingInitialized: boolean,
) {
    const [state, setState] = useState<PeerInitState>({
        isInitialized: false,
        error: null,
    });

    useEffect(() => {
        if (!identity || !isMessagingInitialized) {
            setState({ isInitialized: false, error: null });
            return;
        }

        const initializePeers = async () => {
            try {
                logger.info('Initializing peer controller');
                await peerService.initAllPeers();
                setState({ isInitialized: true, error: null });
                logger.info('Peer controller initialized successfully');
            } catch (error) {
                logger.error('Failed to initialize peer controller', error);
                setState({ isInitialized: false, error: error as Error });
            }
        };

        initializePeers();
    }, [identity, isMessagingInitialized]);

    return state;
}
