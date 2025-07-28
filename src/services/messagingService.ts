import { smashService } from '@src/services/smashService';
import { useChatStore } from '@src/shared/hooks/useChatStore';
import type { SmashMessage } from '@src/shared/types/smash';
import { logger } from '@src/shared/utils/logger';
import type { DIDString, IMMediaEmbedded } from 'smash-node-lib';

export class MessagingService {
    /**
     * Load messages for a conversation
     */
    async loadMessages(conversationId: string): Promise<SmashMessage[]> {
        logger.info('Loading messages for conversation', { conversationId });
        return smashService.getMessages(conversationId);
    }

    /**
     * Send a message to a conversation
     */
    async sendMessage(
        conversationId: DIDString,
        content: string | IMMediaEmbedded,
    ): Promise<SmashMessage> {
        logger.info('Sending message', {
            conversationId,
            contentType: typeof content,
        });
        const message = await smashService.sendMessage(conversationId, content);

        // Update conversation in live state with the new message as last message
        try {
            const { db } = await import('@src/services/db');
            const conversation = await db.getConversation(conversationId);
            if (conversation) {
                const updatedConversation = {
                    ...conversation,
                    lastMessage: message,
                    updatedAt: message.timestamp,
                };

                // Update the chat store with the new conversation state
                const chatStore = useChatStore.getState();
                const existingConversations = chatStore.conversations;
                const updatedConversations = existingConversations
                    .map((c) =>
                        c.id === conversationId ? updatedConversation : c,
                    )
                    .sort((a, b) => b.updatedAt - a.updatedAt);

                useChatStore.setState({ conversations: updatedConversations });

                logger.debug(
                    'Updated conversation in live state after sending message',
                    {
                        conversationId,
                        lastMessageId: message.id,
                    },
                );
            }
        } catch (error) {
            logger.warn(
                'Failed to update conversation in live state after sending',
                {
                    conversationId,
                    error,
                },
            );
        }

        return message;
    }

    /**
     * Mark conversation as read
     */
    async markConversationAsRead(conversationId: string): Promise<void> {
        logger.info('Marking conversation as read', { conversationId });
        return smashService.markConversationAsRead(conversationId);
    }

    /**
     * Get all conversations
     */
    async getConversations() {
        logger.info('Loading all conversations');
        return smashService.getConversations();
    }
}

// Export singleton instance
export const messagingService = new MessagingService();
