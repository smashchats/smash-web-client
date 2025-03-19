import {
    DID,
    DIDString,
    IMProtoMessage,
    IMText,
    IM_CHAT_TEXT,
    MessageStatus,
    SmashUser,
    sha256,
} from 'smash-node-lib';

import { StoredConversation, StoredMessage, db } from '../db';
import { logger } from '../logger';
import { SmashMessage } from '../types';

export type MessageCallback = (message: SmashMessage) => void;
export type ConversationCallback = (conversation: StoredConversation) => void;
export type StatusCallback = (
    messageId: string,
    status: SmashMessage['status'],
) => void;

class SmashService {
    private static instance: SmashService;
    private messageCallbacks: Set<MessageCallback> = new Set();
    private conversationCallbacks: Set<ConversationCallback> = new Set();
    private statusCallbacks: Set<StatusCallback> = new Set();
    private smashUser: SmashUser | null = null;

    private constructor() {
        // We don't need to set up event listeners in constructor
        // They will be set up when a user is initialized
    }

    static getInstance(): SmashService {
        if (!SmashService.instance) {
            SmashService.instance = new SmashService();
        }
        return SmashService.instance;
    }

    async init(smashUser: SmashUser): Promise<void> {
        this.smashUser = smashUser;
        await db.init();

        // Set up message listeners
        this.smashUser.on(IM_CHAT_TEXT, this.handleIncomingMessage.bind(this));

        // Set up status listener
        this.smashUser.on(
            'status',
            (status: MessageStatus, messageIds: sha256[]) => {
                messageIds.forEach((messageId) => {
                    const mappedStatus = this.mapMessageStatus(status);
                    void db.updateMessageStatus(messageId, mappedStatus);
                    this.statusCallbacks.forEach((callback) =>
                        callback(messageId, mappedStatus),
                    );
                });
            },
        );
    }

    private mapMessageStatus(status: MessageStatus): StoredMessage['status'] {
        switch (status) {
            case 'received':
            case 'delivered':
                return 'delivered';
            case 'read':
                return 'read';
            default:
                return 'error';
        }
    }

    private async handleIncomingMessage(
        senderId: DIDString,
        message: IMProtoMessage,
    ): Promise<void> {
        if (!this.smashUser) throw new Error('SmashService not initialized');

        logger.info('Handling incoming message', {
            senderId,
            messageId: message.sha256,
        });

        const storedMessage: StoredMessage = {
            id: message.sha256 || crypto.randomUUID(),
            content: message.data as string,
            sender: senderId,
            conversationId: senderId,
            timestamp: message.timestamp || new Date().toISOString(),
            status: 'delivered',
        };

        logger.debug('Storing incoming message', {
            messageId: storedMessage.id,
        });

        // Add message to database - this will also create a conversation if it doesn't exist
        await db.addMessage(storedMessage);

        // Get or create conversation with incremented unread count
        let conversation = await db.getConversation(senderId);
        if (!conversation) {
            // Create new conversation with unread count 1
            conversation = {
                id: senderId,
                title: `Chat with ${senderId.slice(0, 8)}...`,
                participants: ['You', senderId],
                type: 'direct',
                unreadCount: 1,
                updatedAt: storedMessage.timestamp,
                lastMessage: storedMessage,
            };
            logger.debug('Creating new conversation', {
                conversationId: conversation.id,
            });
            await db.addConversation(conversation);
        } else {
            // Update existing conversation with incremented unread count
            conversation = {
                ...conversation,
                unreadCount: (conversation.unreadCount || 0) + 1,
                lastMessage: storedMessage,
                updatedAt: storedMessage.timestamp,
            };
            logger.debug('Updating existing conversation', {
                conversationId: conversation.id,
                unreadCount: conversation.unreadCount,
            });
            await db.updateConversation(conversation);
        }

        logger.debug('Notifying conversation update', {
            conversationId: conversation.id,
        });
        this.conversationCallbacks.forEach((callback) =>
            callback(conversation),
        );

        const smashMessage: SmashMessage = {
            ...storedMessage,
            timestamp: new Date(storedMessage.timestamp),
        };
        logger.debug('Notifying message received', {
            messageId: smashMessage.id,
        });
        this.messageCallbacks.forEach((cb) => cb(smashMessage));
    }

    async sendMessage(
        conversationId: DIDString,
        content: string,
    ): Promise<SmashMessage> {
        if (!this.smashUser) throw new Error('SmashService not initialized');

        logger.info('Sending message', {
            conversationId,
            contentLength: content.length,
        });

        // Create message
        const message = new IMText(content);
        const sent = await this.smashUser.send(conversationId as DID, message);

        const smashMessage: SmashMessage = {
            id: sent.sha256!,
            conversationId,
            content,
            sender: 'You',
            timestamp: new Date(sent.timestamp),
            status: 'sent',
        };

        logger.debug('Storing sent message', { messageId: smashMessage.id });

        // Store in database
        await db.addMessage({
            ...smashMessage,
            timestamp: smashMessage.timestamp.toISOString(),
            status: 'sent',
        });

        return smashMessage;
    }

    async getMessages(conversationId: string): Promise<SmashMessage[]> {
        logger.debug('Getting messages', { conversationId });
        const messages = await db.getMessages(conversationId);
        logger.debug('Retrieved messages', {
            conversationId,
            count: messages.length,
        });
        return messages.map((msg) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
        }));
    }

    async getConversations(): Promise<StoredConversation[]> {
        logger.debug('Getting conversations');
        const conversations = await db.getConversations();
        logger.debug('Retrieved conversations', {
            count: conversations.length,
        });
        return conversations;
    }

    async markConversationAsRead(conversationId: string): Promise<void> {
        logger.info('Marking conversation as read', { conversationId });
        // Update conversation in database
        const conversation = await db.getConversation(conversationId);
        if (conversation) {
            conversation.unreadCount = 0;
            await db.updateConversation(conversation);

            // Notify UI about the update
            this.conversationCallbacks.forEach((callback) =>
                callback(conversation),
            );
            logger.debug('Conversation marked as read', { conversationId });
        } else {
            logger.warn('Conversation not found for marking as read', {
                conversationId,
            });
        }
    }

    async markMessageAsRead(messageId: string): Promise<void> {
        if (!this.smashUser) throw new Error('SmashService not initialized');

        try {
            logger.info('Marking message as read', { messageId });

            // Get the message to find its conversation
            const message = await db.getMessage(messageId);
            if (!message) {
                logger.warn('Message not found when marking as read', {
                    messageId,
                });
                return;
            }

            // Acknowledge the message as read
            await this.smashUser.ackMessagesRead(
                message.conversationId as DID,
                [messageId as sha256],
            );

            // Update the message status in the database
            await db.updateMessageStatus(messageId, 'read');

            // Get all messages for this conversation to count unread ones
            const messages = await db.getMessages(message.conversationId);
            const unreadCount = messages.filter(
                (msg) => msg.sender !== 'You' && msg.status !== 'read',
            ).length;

            // Update the conversation's unread count
            const conversation = await db.getConversation(
                message.conversationId,
            );
            if (conversation) {
                conversation.unreadCount = unreadCount;

                // Update the conversation in the database
                await db.updateConversation(conversation);

                // Notify listeners about the conversation update
                this.conversationCallbacks.forEach((callback) =>
                    callback(conversation),
                );
            }

            logger.debug('Message marked as read successfully', {
                messageId,
                conversationId: message.conversationId,
                updatedUnreadCount: unreadCount,
            });
        } catch (err) {
            logger.error('Failed to mark message as read', err);
            throw err;
        }
    }

    onMessageReceived(callback: MessageCallback): void {
        this.messageCallbacks.add(callback);
        logger.debug('Added message received callback', {
            callbackCount: this.messageCallbacks.size,
        });
    }

    offMessageReceived(callback: MessageCallback): void {
        this.messageCallbacks.delete(callback);
    }

    onConversationUpdated(callback: ConversationCallback): void {
        this.conversationCallbacks.add(callback);
        logger.debug('Added conversation updated callback', {
            callbackCount: this.conversationCallbacks.size,
        });
    }

    offConversationUpdated(callback: ConversationCallback): void {
        this.conversationCallbacks.delete(callback);
    }

    onMessageStatusUpdated(callback: StatusCallback): void {
        this.statusCallbacks.add(callback);
        logger.debug('Added message status updated callback', {
            callbackCount: this.statusCallbacks.size,
        });
    }

    offMessageStatusUpdated(callback: StatusCallback): void {
        this.statusCallbacks.delete(callback);
    }

    async close(): Promise<void> {
        logger.info('Closing SmashService');
        if (this.smashUser) {
            await this.smashUser.close();
            this.smashUser = null;
        }
        await db.close();
        logger.debug('SmashService closed successfully');
    }
}

export const smashService = SmashService.getInstance();
