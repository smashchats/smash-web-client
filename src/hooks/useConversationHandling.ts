import { useEffect, useState } from 'react';

import { initDB } from '../lib/db';
import { logger } from '../lib/logger';
import { smashService } from '../lib/smash/smash-service';
import {
    SmashConversation,
    SmashMessage,
    StoredConversation,
} from '../lib/types';

const convertToSmashConversation = (
    conversation: StoredConversation,
): SmashConversation => ({
    ...conversation,
    lastMessage: conversation.lastMessage
        ? {
              ...conversation.lastMessage,
              timestamp: new Date(conversation.lastMessage.timestamp),
          }
        : undefined,
});

export const useConversationHandling = () => {
    const [conversations, setConversations] = useState<SmashConversation[]>([]);
    const [error, setError] = useState<Error | null>(null);

    const loadConversations = async () => {
        try {
            logger.info('Loading conversations');
            setError(null);
            await initDB();
            const convos = await smashService.getConversations();
            setConversations(convos.map(convertToSmashConversation));
            logger.debug('Conversations loaded successfully', {
                count: convos.length,
            });
        } catch (err) {
            const error =
                err instanceof Error
                    ? err
                    : new Error('Failed to load conversations');
            logger.error('Failed to load conversations', error);
            setError(error);
        }
    };

    useEffect(() => {
        loadConversations();

        const handleConversationUpdate = (conversation: StoredConversation) => {
            logger.info('Conversation updated', {
                conversationId: conversation.id,
            });
            setConversations((prev) => {
                const smashConversation =
                    convertToSmashConversation(conversation);
                const existing = prev.find((c) => c.id === conversation.id);
                if (existing) {
                    return prev.map((c) =>
                        c.id === conversation.id ? smashConversation : c,
                    );
                } else {
                    return [...prev, smashConversation];
                }
            });
        };

        smashService.onConversationUpdated(handleConversationUpdate);

        return () => {
            logger.debug('Cleaning up conversation handlers');
        };
    }, []);

    const updateConversationWithMessage = (
        conversationId: string,
        lastMessage: SmashMessage,
    ) => {
        logger.debug('Updating conversation with new message', {
            conversationId,
            messageId: lastMessage.id,
        });
        setConversations((prev) =>
            prev.map((conv) =>
                conv.id === conversationId
                    ? {
                          ...conv,
                          lastMessage,
                      }
                    : conv,
            ),
        );
    };

    const markConversationAsRead = async (conversationId: string) => {
        try {
            logger.info('Marking conversation as read', { conversationId });
            await smashService.markConversationAsRead(conversationId);
            logger.debug('Conversation marked as read successfully');
        } catch (err) {
            const error =
                err instanceof Error
                    ? err
                    : new Error('Failed to mark conversation as read');
            logger.error('Failed to mark conversation as read', error);
            throw error;
        }
    };

    return {
        conversations,
        error,
        updateConversationWithMessage,
        markConversationAsRead,
        refreshConversations: loadConversations,
    };
};
