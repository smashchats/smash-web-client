import { useEffect, useState } from 'react';

import { initDB } from '../lib/db';
import { logger } from '../lib/logger';
import { smashService } from '../lib/smash/smash-service';
import { SmashConversation, SmashMessage } from '../lib/types';

export const useConversationHandling = () => {
    const [conversations, setConversations] = useState<SmashConversation[]>([]);
    const [error, setError] = useState<Error | null>(null);

    const addNewConversation = (conversation: SmashConversation) => {
        logger.debug('Adding new conversation', {
            conversationId: conversation.id,
        });
        setConversations((prev) => {
            const updated = [...prev, conversation];
            return updated.sort((a, b) => b.updatedAt - a.updatedAt);
        });
    };

    const loadConversations = async () => {
        try {
            logger.info('Loading conversations');
            setError(null);
            await initDB();
            const convos = await smashService.getConversations();
            const sortedConversations = convos.sort(
                (a, b) => b.updatedAt - a.updatedAt,
            );
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

        const handleConversationUpdate = (conversation: SmashConversation) => {
            logger.info('Conversation updated', {
                conversationId: conversation.id,
            });
            setConversations((prev) => {
                const existing = prev.find((c) => c.id === conversation.id);
                if (existing) {
                    // Update existing conversation
                    const updated = prev.map((c) =>
                        c.id === conversation.id ? conversation : c,
                    );
                    // Sort by updatedAt timestamp
                    return updated.sort((a, b) => b.updatedAt - a.updatedAt);
                } else {
                    // Add new conversation and sort
                    const updated = [...prev, conversation];
                    return updated.sort((a, b) => b.updatedAt - a.updatedAt);
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
                          updatedAt: lastMessage.timestamp,
                      }
                    : conv,
            );
            // Sort by updatedAt timestamp
            return updated.sort((a, b) => b.updatedAt - a.updatedAt);
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
