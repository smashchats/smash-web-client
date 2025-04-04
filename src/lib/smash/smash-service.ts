import {
    DID,
    DIDString,
    EmbeddedBase64Media,
    EncapsulatedIMProtoMessage,
    IMMediaEmbedded,
    IMMediaEmbeddedMessage,
    IMProtoMessage,
    IMText,
    IM_CHAT_TEXT,
    IM_MEDIA_EMBEDDED,
    MessageStatus as NodeLibMessageStatus,
    SmashUser,
    encapsulateMessage,
    sha256,
} from 'smash-node-lib';

import { db } from '../db';
import { logger } from '../logger';
import { MessageStatus, SmashConversation, SmashMessage } from '../types';

export type MessageCallback = (message: SmashMessage) => void;
export type ConversationCallback = (conversation: SmashConversation) => void;
export type StatusCallback = (messageId: string, status: MessageStatus) => void;

class SmashService {
    private static instance: SmashService;
    private messageCallbacks = new Set<MessageCallback>();
    private conversationCallbacks = new Set<ConversationCallback>();
    private statusCallbacks = new Set<StatusCallback>();
    private smashUser: SmashUser | null = null;

    private constructor() {}

    static getInstance(): SmashService {
        if (!SmashService.instance) {
            SmashService.instance = new SmashService();
        }
        return SmashService.instance;
    }

    async init(smashUser: SmashUser): Promise<void> {
        this.smashUser = smashUser;
        await db.init();

        this.setupMessageListeners();
        this.setupStatusListener();
    }

    private setupMessageListeners(): void {
        if (!this.smashUser) return;

        this.smashUser.on(IM_CHAT_TEXT, this.handleIncomingMessage.bind(this));
        this.smashUser.on(
            IM_MEDIA_EMBEDDED,
            this.handleIncomingMessage.bind(this),
        );
    }

    private setupStatusListener(): void {
        if (!this.smashUser) return;

        this.smashUser.on(
            'status',
            async (status: NodeLibMessageStatus, messageIds: sha256[]) => {
                // Debug the incoming status update
                logger.debug('Received status update from library', {
                    status,
                    messageIds,
                });

                for (const messageId of messageIds) {
                    try {
                        // Convert library status to our app status
                        const mappedStatus = this.mapMessageStatus(status);

                        // Try to find the message in our database using the SHA256 ID directly
                        const message = await db.getMessage(messageId);

                        if (message) {
                            // We found it - update the status
                            await db.updateMessageStatus(
                                messageId,
                                mappedStatus,
                            );
                            this.notifyStatusCallbacks(messageId, mappedStatus);
                            logger.debug('Updated message status', {
                                messageId,
                                status: mappedStatus,
                            });
                        } else {
                            // If message isn't found with the SHA256 ID, this is an error
                            logger.error(
                                'Could not find message for status update',
                                {
                                    messageId,
                                    status,
                                },
                            );
                        }
                    } catch (err) {
                        logger.error('Error processing status update', {
                            messageId,
                            status,
                            error: err,
                        });
                    }
                }
            },
        );
    }

    private mapMessageStatus(status: NodeLibMessageStatus): MessageStatus {
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

    private createSmashMessage(
        senderId: DIDString,
        message: IMProtoMessage,
    ): SmashMessage {
        if (!message.sha256) {
            throw new Error('Message must have a sha256 hash to be stored');
        }

        const baseMessage = {
            id: message.sha256,
            sender: senderId,
            conversationId: senderId,
            timestamp: message.timestamp
                ? new Date(message.timestamp).getTime()
                : Date.now(),
            status: 'delivered' as const,
        };

        if (message.type === IM_CHAT_TEXT) {
            return {
                ...baseMessage,
                type: 'im.chat.text',
                content: message.data as string,
            };
        }

        if (message.type === IM_MEDIA_EMBEDDED) {
            const mediaMessage = message as IMMediaEmbeddedMessage;
            return {
                ...baseMessage,
                type: 'im.chat.media.embedded',
                content: mediaMessage.data,
            };
        }

        throw new Error(`Unknown message type: ${message.type}`);
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

        const storedMessage = this.createSmashMessage(senderId, message);
        await this.storeMessage(storedMessage);
        await this.updateConversation(senderId, storedMessage);
    }

    private async storeMessage(message: SmashMessage): Promise<void> {
        logger.debug('Storing incoming message', { messageId: message.id });
        await db.addMessage(message);
    }

    private async updateConversation(
        senderId: DIDString,
        message: SmashMessage,
    ): Promise<void> {
        let conversation = await db.getConversation(senderId);

        if (!conversation) {
            conversation = await this.createNewConversation(senderId, message);
        } else {
            conversation = await this.updateExistingConversation(
                conversation,
                message,
            );
        }

        this.notifyConversationCallbacks(conversation);
        this.notifyMessageCallbacks(message);
    }

    private async createNewConversation(
        senderId: DIDString,
        message: SmashMessage,
    ): Promise<SmashConversation> {
        const conversation = {
            id: senderId,
            title: `Chat with ${senderId.slice(0, 8)}...`,
            participants: ['You', senderId],
            type: 'direct' as const,
            unreadCount: 1,
            updatedAt: message.timestamp,
            lastMessage: message,
        };

        logger.debug('Creating new conversation', {
            conversationId: conversation.id,
        });
        await db.addConversation(conversation);
        return conversation;
    }

    private async updateExistingConversation(
        conversation: SmashConversation,
        message: SmashMessage,
    ): Promise<SmashConversation> {
        const updatedConversation = {
            ...conversation,
            unreadCount: (conversation.unreadCount || 0) + 1,
            lastMessage: message,
            updatedAt: message.timestamp,
        };

        logger.debug('Updating existing conversation', {
            conversationId: updatedConversation.id,
            unreadCount: updatedConversation.unreadCount,
        });

        await db.updateConversation(updatedConversation);
        return updatedConversation;
    }

    private notifyConversationCallbacks(conversation: SmashConversation): void {
        logger.debug('Notifying conversation update', {
            conversationId: conversation.id,
        });
        this.conversationCallbacks.forEach((callback) =>
            callback(conversation),
        );
    }

    private notifyMessageCallbacks(message: SmashMessage): void {
        logger.debug('Notifying message received', { messageId: message.id });
        this.messageCallbacks.forEach((cb) => cb(message));
    }

    private notifyStatusCallbacks(
        messageId: string,
        status: MessageStatus,
    ): void {
        this.statusCallbacks.forEach((callback) => callback(messageId, status));
    }

    async sendMessage(
        conversationId: DIDString,
        content: string | IMMediaEmbedded,
    ): Promise<SmashMessage> {
        if (!this.smashUser) throw new Error('SmashService not initialized');

        const message: IMProtoMessage =
            typeof content === 'string' ? new IMText(content) : content;
        const encapsulated = await encapsulateMessage(message);

        const smashMessage = await this.createOutgoingMessage(
            conversationId,
            message,
            encapsulated,
        );
        await db.addMessage(smashMessage);

        void this.sendInBackground(conversationId as DID, encapsulated);
        return smashMessage;
    }

    private async createOutgoingMessage(
        conversationId: DIDString,
        message: IMProtoMessage,
        encapsulated: { sha256?: string },
    ): Promise<SmashMessage> {
        const baseMessage = {
            id: encapsulated.sha256!,
            conversationId,
            sender: 'You',
            timestamp: Date.now(),
            status: 'sending' as const,
        };

        return typeof message.data === 'string'
            ? {
                  ...baseMessage,
                  type: 'im.chat.text' as const,
                  content: message.data,
              }
            : {
                  ...baseMessage,
                  type: 'im.chat.media.embedded' as const,
                  content: message.data as EmbeddedBase64Media,
              };
    }

    private async sendInBackground(
        recipientDid: DID,
        message: EncapsulatedIMProtoMessage,
    ): Promise<void> {
        try {
            await this.smashUser!.send(recipientDid, message);
        } catch (err) {
            await this.handleMessageError(message.sha256, err);
        }
    }

    private async handleMessageError(
        messageId: string,
        error: unknown,
    ): Promise<void> {
        logger.error('Failed to send message', error);
        await db.updateMessageStatus(messageId, 'failed');
        this.notifyStatusCallbacks(messageId, 'failed');
    }

    async getMessages(conversationId: string): Promise<SmashMessage[]> {
        logger.debug('Getting messages', { conversationId });
        const storedMessages = await db.getMessages(conversationId);
        logger.debug('Retrieved messages', {
            conversationId,
            count: storedMessages.length,
        });
        return storedMessages;
    }

    async getConversations(): Promise<SmashConversation[]> {
        logger.debug('Getting conversations');
        const conversations = await db.getConversations();
        logger.debug('Retrieved conversations', {
            count: conversations.length,
        });
        return conversations;
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

    async markMessageAsRead(messageId: string): Promise<void> {
        if (!this.smashUser) throw new Error('SmashService not initialized');

        try {
            const message = await this.getMessageForReading(messageId);
            if (!message) return;

            await this.acknowledgeMessageRead(message);
            await this.updateMessageAndConversation(message);
        } catch (err) {
            logger.error('Failed to mark message as read', err);
            throw err;
        }
    }

    private async getMessageForReading(
        messageId: string,
    ): Promise<SmashMessage | null> {
        logger.info('Marking message as read', { messageId });

        const message = await db.getMessage(messageId);
        if (!message) {
            logger.warn('Message not found when marking as read', {
                messageId,
            });
            return null;
        }
        return message;
    }

    private async acknowledgeMessageRead(message: SmashMessage): Promise<void> {
        await this.smashUser!.ackMessagesRead(message.conversationId as DID, [
            message.id as sha256,
        ]);
        await db.updateMessageStatus(message.id, 'read');
    }

    private async updateMessageAndConversation(
        message: SmashMessage,
    ): Promise<void> {
        const messages = await db.getMessages(message.conversationId);
        const unreadCount = messages.filter(
            (msg) => msg.sender !== 'You' && msg.status !== 'read',
        ).length;

        const conversation = await db.getConversation(message.conversationId);
        if (conversation) {
            conversation.unreadCount = unreadCount;
            await db.updateConversation(conversation);
            this.notifyConversationCallbacks(conversation);
        }

        logger.debug('Message marked as read successfully', {
            messageId: message.id,
            conversationId: message.conversationId,
            updatedUnreadCount: unreadCount,
        });
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
