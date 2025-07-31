import type { SmashConversation, SmashMessage } from '@smash/smash';
import { logger } from '@utils/logger';
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
        logger.info('🔄 ConversationService.updateConversation ENTRY', {
            conversationId,
            messageId: lastMessage.id,
            messageSender: lastMessage.sender,
            incrementUnread,
        });

        const conversation = await db.getConversation(conversationId);
        if (!conversation) {
            logger.warn('⚠️ Conversation not found for update', {
                conversationId,
            });
            return null;
        }

        logger.info('📊 Current conversation state', {
            conversationId,
            currentUnreadCount: conversation.unreadCount,
            currentLastMessageId: conversation.lastMessage?.id,
            newMessageId: lastMessage.id,
            newMessageSender: lastMessage.sender,
        });

        conversation.lastMessage = lastMessage;
        conversation.updatedAt = lastMessage.timestamp;

        const shouldIncrement = incrementUnread && lastMessage.sender !== 'You';
        logger.info('🧮 Unread count logic', {
            incrementUnread,
            messageSender: lastMessage.sender,
            shouldIncrement,
            currentCount: conversation.unreadCount,
        });

        if (shouldIncrement) {
            const oldCount = conversation.unreadCount;
            conversation.unreadCount += 1;
            logger.info('⬆️ INCREMENTED unread count', {
                conversationId,
                oldCount,
                newCount: conversation.unreadCount,
                messageId: lastMessage.id,
            });
        } else {
            logger.info('➡️ NOT incrementing unread count', {
                conversationId,
                reason: !incrementUnread
                    ? 'incrementUnread=false'
                    : 'message from You',
                currentCount: conversation.unreadCount,
            });
        }

        await db.updateConversation(conversation);
        logger.info('💾 Updated conversation in database', {
            conversationId,
            finalUnreadCount: conversation.unreadCount,
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
        logger.info('➕ Added conversation updated callback', {
            callbackCount: this.conversationCallbacks.size,
        });

        // Return cleanup function
        return () => {
            this.conversationCallbacks.delete(callback);
            logger.info('➖ Removed conversation updated callback', {
                callbackCount: this.conversationCallbacks.size,
            });
        };
    }

    private notifyConversationCallbacks(conversation: SmashConversation): void {
        logger.info('📢 notifyConversationCallbacks ENTRY', {
            conversationId: conversation.id,
            unreadCount: conversation.unreadCount,
            callbackCount: this.conversationCallbacks.size,
        });

        this.conversationCallbacks.forEach((callback, index) => {
            try {
                logger.debug('🔔 Executing conversation callback', {
                    conversationId: conversation.id,
                    callbackIndex: index,
                });
                callback(conversation);
                logger.debug('✅ Conversation callback executed successfully', {
                    conversationId: conversation.id,
                    callbackIndex: index,
                });
            } catch (error) {
                logger.error('❌ Error in conversation callback', {
                    conversationId: conversation.id,
                    callbackIndex: index,
                    error,
                });
            }
        });

        logger.info('📢 notifyConversationCallbacks COMPLETE', {
            conversationId: conversation.id,
            callbacksExecuted: this.conversationCallbacks.size,
        });
    }

    async close(): Promise<void> {
        this.conversationCallbacks.clear();
        logger.debug('ConversationService closed');
    }
}

export const conversationService = ConversationService.getInstance();
