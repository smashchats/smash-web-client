import { useChatStore } from '@hooks/useChatStore';
import { peerService } from '@services/peerService';
import { logger } from '@utils/logger';
import { useEffect } from 'react';
import type {
    DIDString,
    IMDIDDocumentMessage,
    IMProfileMessage,
} from 'smash-node-lib';

/**
 * Hook to set up peer event handlers
 * This replaces the peerController event handling logic
 */
export function usePeerHandlers() {
    useEffect(() => {
        logger.info('Setting up peer event handlers');

        // The actual event listener setup happens in the smashService
        // This hook just ensures the handlers are initialized
        logger.info('Peer handlers hook initialized');

        return () => {
            logger.debug('Cleaning up peer handlers');
        };
    }, []);
}

/**
 * Handler functions that can be called by smashService
 * These replace the peerController methods
 */
export const peerHandlers = {
    async handleIncomingDIDDocument(
        senderId: DIDString,
        message: IMDIDDocumentMessage,
    ): Promise<void> {
        logger.info('Handling incoming DID document', {
            senderId,
            didId: message.data.id,
        });

        try {
            await peerService.handleIncomingDIDDocument(senderId, message);
        } catch (error) {
            logger.error('Failed to handle incoming DID document', error);
        }
    },

    async handleIncomingProfile(
        senderId: DIDString,
        message: IMProfileMessage,
    ): Promise<void> {
        logger.info('Handling incoming profile', {
            senderId,
            profileDid: message.data.did,
            title: message.data.title,
        });

        try {
            await peerService.handleIncomingProfile(
                senderId,
                message,
                // UI update callback
                (peerId, profile) => {
                    logger.debug('Updating profile in chat store', {
                        peerId,
                        profile,
                    });
                    useChatStore.getState().setPeerProfile(peerId, profile);
                },
            );
        } catch (error) {
            logger.error('Failed to handle incoming profile', error);
        }
    },
};
