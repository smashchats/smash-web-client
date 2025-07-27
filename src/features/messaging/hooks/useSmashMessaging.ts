import { initializeMessageController } from '@src/controllers/messageController';
import { smashService } from '@src/services/smashService';
import { initializeChatStore } from '@src/shared/hooks/useChatStore';
import { logger } from '@src/shared/utils/logger';
import { useEffect, useState } from 'react';
import type { SmashUser } from 'smash-node-lib';

interface SmashMessagingState {
    isInitialized: boolean;
    error: Error | null;
}

export function useSmashMessaging(smashUser: SmashUser | null) {
    const [state, setState] = useState<SmashMessagingState>({
        isInitialized: false,
        error: null,
    });

    useEffect(() => {
        if (!smashUser) {
            setState({ isInitialized: false, error: null });
            return;
        }

        let cleanup: (() => void) | undefined;

        const initializeMessaging = async () => {
            try {
                logger.info('Initializing messaging service');

                // Initialize smashService with the smashUser
                smashService.init(smashUser);

                // Initialize chats - for now with empty array
                // In the future, this could load saved chats from storage
                await smashUser.initChats([]);

                // Initialize message controller listeners
                const cleanupMessageController = initializeMessageController();

                // Initialize chat store (conversations)
                const cleanupChatStore = initializeChatStore();

                // Store cleanup function
                cleanup = () => {
                    cleanupMessageController();
                    cleanupChatStore();
                };

                setState({ isInitialized: true, error: null });
                logger.info('Messaging service initialized successfully');
            } catch (error) {
                logger.error('Failed to initialize messaging service', error);
                setState({ isInitialized: false, error: error as Error });
            }
        };

        initializeMessaging();

        // Cleanup function
        return () => {
            cleanup?.();
            setState({ isInitialized: false, error: null });
        };
    }, [smashUser]);

    return state;
}
