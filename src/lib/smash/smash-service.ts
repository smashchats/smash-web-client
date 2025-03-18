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

        // Mark message as received if it has a hash
        if (message.sha256) {
            logger.debug('Acknowledging message', {
                messageId: message.sha256,
            });
            await this.smashUser.ackMessagesRead(senderId, [message.sha256]);
        }
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

    onMessageReceived(callback: MessageCallback): void {
        this.messageCallbacks.add(callback);
        logger.debug('Added message received callback', {
            callbackCount: this.messageCallbacks.size,
        });
    }

    onConversationUpdated(callback: ConversationCallback): void {
        this.conversationCallbacks.add(callback);
        logger.debug('Added conversation updated callback', {
            callbackCount: this.conversationCallbacks.size,
        });
    }

    onMessageStatusUpdated(callback: StatusCallback): void {
        this.statusCallbacks.add(callback);
        logger.debug('Added message status updated callback', {
            callbackCount: this.statusCallbacks.size,
        });
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
