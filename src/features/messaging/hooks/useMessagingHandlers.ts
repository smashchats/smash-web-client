import { useChatStore } from '@hooks/useChatStore';
import { useMessageStore } from '@hooks/useMessageStore';
import { db } from '@services/db';
import { smashOrchestrator } from '@services/smashOrchestrator';
import type { SmashConversation, SmashMessage } from '@smash/smash';
import { logger } from '@utils/logger';
import { useEffect } from 'react';

/**
 * Hook to set up messaging event handlers
 * This replaces the messageController event handling logic
 */
export function useMessagingHandlers() {
    useEffect(() => {
        logger.info('🚀 useMessagingHandlers effect STARTING');

        const handleIncomingMessage = (message: SmashMessage) => {
            logger.info('🔔 useMessagingHandlers.handleIncomingMessage', {
                messageId: message.id,
                conversationId: message.conversationId,
                sender: message.sender,
            });
            // Message is already stored by smashService, just update UI store
            useMessageStore
                .getState()
                .addMessage(message.conversationId, message);
            logger.debug('✅ Added message to UI store', {
                messageId: message.id,
                conversationId: message.conversationId,
            });
        };

        const handleMessageStatusUpdate = async (
            messageId: string,
            newStatus: SmashMessage['status'],
        ) => {
            logger.debug('Handling message status update', {
                messageId,
                newStatus,
            });

            try {
                const message = await db.getMessage(messageId);
                if (!message) {
                    logger.warn('Message not found in DB for status update', {
                        messageId,
                        newStatus,
                    });
                    return;
                }

                await db.updateMessageStatus(messageId, newStatus);
                logger.debug('Updating message status in UI store', {
                    conversationId: message.conversationId,
                    messageId,
                    newStatus,
                });

                useMessageStore
                    .getState()
                    .updateMessageStatus(
                        message.conversationId,
                        messageId,
                        newStatus,
                    );
            } catch (error) {
                logger.error('Error processing message status update', {
                    messageId,
                    newStatus,
                    error,
                });
            }
        };

        const handleConversationUpdate = (conversation: SmashConversation) => {
            logger.info('Handling conversation update', {
                conversationId: conversation.id,
                unreadCount: conversation.unreadCount,
            });

            const state = useChatStore.getState();
            const existing = state.conversations.find(
                (c) => c.id === conversation.id,
            );

            if (existing) {
                // Update existing conversation
                const updated = state.conversations.map((c) =>
                    c.id === conversation.id ? conversation : c,
                );
                useChatStore.setState({
                    conversations: updated
                        .slice()
                        .sort((a, b) => b.updatedAt - a.updatedAt),
                });
                logger.debug('Updated existing conversation in store', {
                    conversationId: conversation.id,
                });
            } else {
                // Add new conversation
                state.addNewConversation(conversation);
                logger.debug('Added new conversation to store', {
                    conversationId: conversation.id,
                });
            }
        };

        // Set up event listeners
        const cleanupMessage = smashOrchestrator.onMessageReceived(
            handleIncomingMessage,
        );
        logger.info('📝 Subscribed to message events');

        const cleanupStatus = smashOrchestrator.onMessageStatusUpdated(
            handleMessageStatusUpdate,
        );
        logger.info('📊 Subscribed to status events');

        const cleanupConversation = smashOrchestrator.onConversationUpdated(
            handleConversationUpdate,
        );
        logger.info('💬 Subscribed to conversation events');

        logger.info(
            '🎯 useMessagingHandlers effect COMPLETE - all listeners set up',
        );

        // Return cleanup function
        return () => {
            logger.info('🧹 useMessagingHandlers cleanup STARTING');
            cleanupMessage();
            cleanupStatus();
            cleanupConversation();
            logger.info('🧹 useMessagingHandlers cleanup COMPLETE');
        };
    }, []);
}
