import type { SmashMessage } from '@shared/types/smash';
import { logger } from '@shared/utils/logger';
import type {
    DID,
    DIDString,
    IMMediaEmbeddedMessage,
    IMProtoMessage,
    MessageStatus,
    SmashUser,
    sha256,
} from 'smash-node-lib';
import { IMText, IM_CHAT_TEXT, IM_MEDIA_EMBEDDED } from 'smash-node-lib';

import { db } from './db';

export type MessageCallback = (message: SmashMessage) => void;
export type StatusCallback = (messageId: string, status: MessageStatus) => void;

class MessageService {
    private static instance: MessageService;
    private messageCallbacks = new Set<MessageCallback>();
    private statusCallbacks = new Set<StatusCallback>();

    private constructor() {}

    static getInstance(): MessageService {
        if (!MessageService.instance) {
            MessageService.instance = new MessageService();
        }
        return MessageService.instance;
    }

    async getMessages(conversationId: string): Promise<SmashMessage[]> {
        logger.debug('Getting messages for conversation', { conversationId });
        const messages = await db.getMessages(conversationId);
        logger.debug('Retrieved messages', {
            conversationId,
            count: messages.length,
        });
        return messages;
    }

    async getMessage(messageId: string): Promise<SmashMessage | null> {
        return (await db.getMessage(messageId)) ?? null;
    }

    async sendMessage(
        smashUser: SmashUser,
        recipientId: DIDString,
        content: string | File,
    ): Promise<SmashMessage> {
        if (!smashUser) {
            throw new Error('SmashUser is required for sending messages');
        }

        logger.info('Sending message', { recipientId });

        try {
            let protoMessage: IMProtoMessage;

            if (typeof content === 'string') {
                // Text message
                const textMessage = new IMText(content);
                protoMessage = await smashUser.send(
                    recipientId as DID,
                    textMessage,
                );
            } else {
                // Media message - Handle File object
                const { IMMediaEmbedded } = await import('smash-node-lib');
                const mediaMessage = await IMMediaEmbedded.fromFile(content);
                protoMessage = await smashUser.send(
                    recipientId as DID,
                    mediaMessage,
                );
            }

            if (!protoMessage.sha256) {
                throw new Error('Sent message must have a sha256 hash');
            }

            // Create SmashMessage for storage
            const smashMessage = this.createSmashMessage(
                'You',
                recipientId,
                protoMessage,
                'delivered',
            );

            // Store message
            await this.storeMessage(smashMessage);

            logger.info('Message sent successfully', {
                messageId: smashMessage.id,
                recipientId,
            });

            return smashMessage;
        } catch (error) {
            logger.error('Failed to send message', { recipientId, error });
            throw error;
        }
    }

    async storeMessage(message: SmashMessage): Promise<void> {
        logger.debug('Storing message', { messageId: message.id });
        await db.addMessage(message);
    }

    createSmashMessage(
        senderId: DIDString | 'You',
        conversationId: DIDString,
        message: IMProtoMessage,
        status: MessageStatus = 'delivered',
    ): SmashMessage {
        // Only process actual chat messages, not system messages
        if (
            message.type !== IM_CHAT_TEXT &&
            message.type !== IM_MEDIA_EMBEDDED
        ) {
            throw new Error(
                `Message type ${message.type} is not a chat message`,
            );
        }

        if (!message.sha256) {
            throw new Error('Message must have a sha256 hash to be stored');
        }

        const baseMessage = {
            id: message.sha256,
            sender: senderId,
            conversationId,
            timestamp: message.timestamp
                ? new Date(message.timestamp).getTime()
                : Date.now(),
            status,
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

    async markMessageAsRead(
        smashUser: SmashUser,
        messageId: string,
    ): Promise<void> {
        try {
            const message = await this.getMessage(messageId);
            if (!message) {
                logger.warn('Message not found when marking as read', {
                    messageId,
                });
                return;
            }

            await smashUser.ackMessagesRead(message.conversationId as DID, [
                message.id as sha256,
            ]);
            await this.updateMessageStatus(message.id, 'read');

            logger.debug('Message marked as read successfully', {
                messageId: message.id,
                conversationId: message.conversationId,
            });
        } catch (err) {
            logger.error('Failed to mark message as read', err);
            throw err;
        }
    }

    async updateMessageStatus(
        messageId: string,
        status: MessageStatus,
    ): Promise<void> {
        await db.updateMessageStatus(messageId, status);
        this.notifyStatusCallbacks(messageId, status);
        logger.debug('Updated message status', { messageId, status });
    }

    // Event handling
    onMessageReceived(callback: MessageCallback): () => void {
        this.messageCallbacks.add(callback);
        logger.debug('Added message received callback', {
            callbackCount: this.messageCallbacks.size,
        });

        // Return cleanup function
        return () => {
            this.messageCallbacks.delete(callback);
        };
    }

    onMessageStatusUpdated(callback: StatusCallback): () => void {
        this.statusCallbacks.add(callback);
        logger.debug('Added message status updated callback', {
            callbackCount: this.statusCallbacks.size,
        });

        // Return cleanup function
        return () => {
            this.statusCallbacks.delete(callback);
        };
    }

    notifyMessageCallbacks(message: SmashMessage): void {
        this.messageCallbacks.forEach((callback) => {
            try {
                callback(message);
            } catch (error) {
                logger.error('Error in message callback', error);
            }
        });
    }

    private notifyStatusCallbacks(
        messageId: string,
        status: MessageStatus,
    ): void {
        this.statusCallbacks.forEach((callback) => {
            try {
                callback(messageId, status);
            } catch (error) {
                logger.error('Error in status callback', error);
            }
        });
    }

    async close(): Promise<void> {
        this.messageCallbacks.clear();
        this.statusCallbacks.clear();
        logger.debug('MessageService closed');
    }
}

export const messageService = MessageService.getInstance();
