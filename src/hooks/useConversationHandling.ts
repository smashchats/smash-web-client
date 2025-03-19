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

    const addNewConversation = (conversation: StoredConversation) => {
        logger.debug('Adding new conversation', {
            conversationId: conversation.id,
        });
        setConversations((prev) => {
            const smashConversation = convertToSmashConversation(conversation);
            const updated = [...prev, smashConversation];
            return updated.sort((a, b) => {
                const aTime = a.lastMessage?.timestamp || new Date(0);
                const bTime = b.lastMessage?.timestamp || new Date(0);
                return bTime.getTime() - aTime.getTime();
            });
        });
    };

    const loadConversations = async () => {
        try {
            logger.info('Loading conversations');
            setError(null);
            await initDB();
            const convos = await smashService.getConversations();
            const sortedConversations = convos
                .map(convertToSmashConversation)
                .sort((a, b) => {
                    const aTime = a.lastMessage?.timestamp || new Date(0);
                    const bTime = b.lastMessage?.timestamp || new Date(0);
                    return bTime.getTime() - aTime.getTime();
                });
            setConversations(sortedConversations);
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
                    // Update existing conversation
                    const updated = prev.map((c) =>
                        c.id === conversation.id ? smashConversation : c,
                    );
                    // Sort by last message time
                    return updated.sort((a, b) => {
                        const aTime = a.lastMessage?.timestamp || new Date(0);
                        const bTime = b.lastMessage?.timestamp || new Date(0);
                        return bTime.getTime() - aTime.getTime();
                    });
                } else {
                    // Add new conversation and sort
                    const updated = [...prev, smashConversation];
                    return updated.sort((a, b) => {
                        const aTime = a.lastMessage?.timestamp || new Date(0);
                        const bTime = b.lastMessage?.timestamp || new Date(0);
                        return bTime.getTime() - aTime.getTime();
                    });
                }
            });
        };

        smashService.onConversationUpdated(handleConversationUpdate);

        return () => {
            logger.debug('Cleaning up conversation handlers');
            smashService.offConversationUpdated(handleConversationUpdate);
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
        setConversations((prev) => {
            const updated = prev.map((conv) =>
                conv.id === conversationId
                    ? {
                          ...conv,
                          lastMessage,
                          // Keep the existing unread count as it's handled by handleIncomingMessage
                          unreadCount: conv.unreadCount || 0,
                          updatedAt: lastMessage.timestamp.toISOString(),
                      }
                    : conv,
            );
            // Sort by last message time
            return updated.sort((a, b) => {
                const aTime = a.lastMessage?.timestamp || new Date(0);
                const bTime = b.lastMessage?.timestamp || new Date(0);
                return bTime.getTime() - aTime.getTime();
            });
        });
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
        addNewConversation,
    };
};
