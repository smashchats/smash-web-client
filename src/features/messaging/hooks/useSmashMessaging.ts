// Note: messageController replaced with useMessagingHandlers hook
import { smashOrchestrator } from '@services/smashOrchestrator';
import { initializeChatStore } from '@shared/hooks/useChatStore';
import { logger } from '@shared/utils/logger';
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

                // Initialize smashOrchestrator with the smashUser
                smashOrchestrator.init(smashUser);

                // Initialize chats - for now with empty array
                // In the future, this could load saved chats from storage
                await smashUser.initChats([]);

                // Initialize chat store (conversations)
                const cleanupChatStore = initializeChatStore();

                // Note: Message and peer event handlers are now set up by hooks in AppInitializer
                // Store cleanup function
                cleanup = () => {
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
