import { useChatStore } from '@hooks/useChatStore';
import { smashOrchestrator } from '@services/smashOrchestrator';
import type { SmashMessage } from '@types/smash';
import { logger } from '@utils/logger';
import type { DIDString } from 'smash-node-lib';

export class MessagingService {
    /**
     * Load messages for a conversation
     */
    async loadMessages(conversationId: string): Promise<SmashMessage[]> {
        logger.info('Loading messages for conversation', { conversationId });
        return smashOrchestrator.getMessages(conversationId);
    }

    /**
     * Send a message to a conversation
     */
    async sendMessage(
        conversationId: DIDString,
        content: string | File,
    ): Promise<SmashMessage> {
        logger.info('Sending message', {
            conversationId,
            contentType: typeof content,
        });
        const message = await smashOrchestrator.sendMessage(
            conversationId,
            content,
        );

        // Update conversation in live state with the new message as last message
        try {
            const { db } = await import('@services/db');
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
        return smashOrchestrator.markConversationAsRead(conversationId);
    }

    /**
     * Get all conversations
     */
    async getConversations() {
        logger.info('Loading all conversations');
        return smashOrchestrator.getConversations();
    }
}

// Export singleton instance
export const messagingService = new MessagingService();
