import type { SmashConversation, SmashMessage } from '@shared/types/smash';
import { logger } from '@shared/utils/logger';
import type { DIDString } from 'smash-node-lib';

import { db } from './db';

export type ConversationCallback = (conversation: SmashConversation) => void;

class ConversationService {
    private static instance: ConversationService;
    private conversationCallbacks = new Set<ConversationCallback>();

    private constructor() {}

    static getInstance(): ConversationService {
        if (!ConversationService.instance) {
            ConversationService.instance = new ConversationService();
        }
        return ConversationService.instance;
    }

    async getConversations(): Promise<SmashConversation[]> {
        logger.debug('Getting conversations');
        const conversations = await db.getConversations();
        logger.debug('Retrieved conversations', {
            count: conversations.length,
        });
        return conversations;
    }

    async getConversation(
        conversationId: string,
    ): Promise<SmashConversation | null> {
        return (await db.getConversation(conversationId)) ?? null;
    }

    async createConversation(
        senderId: DIDString,
        lastMessage: SmashMessage,
    ): Promise<SmashConversation> {
        logger.debug('Creating new conversation', { senderId });

        const conversation: SmashConversation = {
            id: senderId,
            title: senderId,
            lastMessage,
            unreadCount: 1,
            participants: [senderId],
            type: 'direct',
            updatedAt: lastMessage.timestamp,
        };

        await db.addConversation(conversation);
        logger.debug('Created new conversation', { conversationId: senderId });
        return conversation;
    }

    async updateConversation(
        conversationId: string,
        lastMessage: SmashMessage,
        incrementUnread = true,
    ): Promise<SmashConversation | null> {
        const conversation = await db.getConversation(conversationId);
        if (!conversation) {
            logger.warn('Conversation not found for update', {
                conversationId,
            });
            return null;
        }

        conversation.lastMessage = lastMessage;
        conversation.updatedAt = lastMessage.timestamp;

        if (incrementUnread && lastMessage.sender !== 'You') {
            conversation.unreadCount += 1;
        }

        await db.updateConversation(conversation);
        logger.debug('Updated conversation', {
            conversationId,
            unreadCount: conversation.unreadCount,
        });

        return conversation;
    }

    async markConversationAsRead(conversationId: string): Promise<void> {
        logger.info('Marking conversation as read', { conversationId });

        const conversation = await db.getConversation(conversationId);
        if (!conversation) {
            logger.warn('Conversation not found for marking as read', {
                conversationId,
            });
            return;
        }

        conversation.unreadCount = 0;
        await db.updateConversation(conversation);
        this.notifyConversationCallbacks(conversation);
        logger.debug('Conversation marked as read', { conversationId });
    }

    async updateConversationUnreadCount(conversationId: string): Promise<void> {
        const messages = await db.getMessages(conversationId);
        const unreadCount = messages.filter(
            (msg) => msg.sender !== 'You' && msg.status !== 'read',
        ).length;

        const conversation = await db.getConversation(conversationId);
        if (conversation) {
            conversation.unreadCount = unreadCount;
            await db.updateConversation(conversation);
            this.notifyConversationCallbacks(conversation);
        }
    }

    // Event handling
    onConversationUpdated(callback: ConversationCallback): () => void {
        this.conversationCallbacks.add(callback);
        logger.debug('Added conversation updated callback', {
            callbackCount: this.conversationCallbacks.size,
        });

        // Return cleanup function
        return () => {
            this.conversationCallbacks.delete(callback);
        };
    }

    private notifyConversationCallbacks(conversation: SmashConversation): void {
        this.conversationCallbacks.forEach((callback) => {
            try {
                callback(conversation);
            } catch (error) {
                logger.error('Error in conversation callback', error);
            }
        });
    }

    async close(): Promise<void> {
        this.conversationCallbacks.clear();
        logger.debug('ConversationService closed');
    }
}

export const conversationService = ConversationService.getInstance();
