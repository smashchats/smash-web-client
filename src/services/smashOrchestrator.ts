import type { SmashConversation, SmashMessage } from '@shared/types/smash';
import { logger } from '@shared/utils/logger';
import type {
    DIDString,
    IMDIDDocumentMessage,
    IMProfileMessage,
    IMProtoMessage,
    MessageStatus,
    SmashUser,
    sha256,
} from 'smash-node-lib';
import {
    IM_CHAT_TEXT,
    IM_DID_DOCUMENT,
    IM_MEDIA_EMBEDDED,
    IM_PROFILE,
} from 'smash-node-lib';

import { conversationService } from './conversationService';
import { messageService } from './messageService';

/**
 * Main orchestrator service that coordinates between message handling,
 * conversation management, and the Smash protocol
 */
class SmashOrchestrator {
    private static instance: SmashOrchestrator;
    private smashUser: SmashUser | null = null;

    private constructor() {}

    static getInstance(): SmashOrchestrator {
        if (!SmashOrchestrator.instance) {
            SmashOrchestrator.instance = new SmashOrchestrator();
        }
        return SmashOrchestrator.instance;
    }

    init(smashUser: SmashUser): void {
        this.smashUser = smashUser;
        this.setupEventListeners();
        logger.info('SmashOrchestrator initialized');
    }

    private setupEventListeners(): void {
        if (!this.smashUser) return;

        // Handle incoming chat messages
        this.smashUser.on(IM_CHAT_TEXT, this.handleIncomingMessage.bind(this));
        this.smashUser.on(
            IM_MEDIA_EMBEDDED,
            this.handleIncomingMessage.bind(this),
        );

        // Handle system messages
        this.smashUser.on(
            IM_DID_DOCUMENT,
            this.handleIncomingDIDDocument.bind(this),
        );
        this.smashUser.on(IM_PROFILE, this.handleIncomingProfile.bind(this));

        // Handle message status updates
        this.smashUser.on('status', this.handleStatusUpdate.bind(this));
    }

    private async handleIncomingMessage(
        senderId: DIDString,
        message: IMProtoMessage,
    ): Promise<void> {
        if (!this.smashUser) return;

        logger.info('Handling incoming message', {
            senderId,
            messageId: message.sha256,
            messageType: message.type,
        });

        try {
            // Only process actual chat messages
            if (
                message.type === IM_CHAT_TEXT ||
                message.type === IM_MEDIA_EMBEDDED
            ) {
                const smashMessage = messageService.createSmashMessage(
                    senderId,
                    senderId, // conversation ID is the sender for direct messages
                    message,
                );

                // Store the message
                await messageService.storeMessage(smashMessage);

                // Update or create conversation
                await this.updateConversationWithMessage(
                    senderId,
                    smashMessage,
                );

                logger.info('Successfully processed incoming chat message', {
                    messageId: smashMessage.id,
                    conversationId: smashMessage.conversationId,
                });
            }
        } catch (error) {
            logger.error('Failed to handle incoming message', {
                senderId,
                messageId: message.sha256,
                messageType: message.type,
                error,
            });
        }
    }

    private async updateConversationWithMessage(
        senderId: DIDString,
        message: SmashMessage,
    ): Promise<void> {
        let conversation = await conversationService.getConversation(senderId);

        if (!conversation) {
            // Create new conversation
            conversation = await conversationService.createConversation(
                senderId,
                message,
            );
        } else {
            // Update existing conversation
            conversation = await conversationService.updateConversation(
                senderId,
                message,
                true, // increment unread count
            );
        }

        if (conversation) {
            // Notify conversation updated
            conversationService['notifyConversationCallbacks'](conversation);
        }

        // Notify message received
        messageService.notifyMessageCallbacks(message);
    }

    private async handleIncomingDIDDocument(
        senderId: DIDString,
        didDocument: IMDIDDocumentMessage,
    ): Promise<void> {
        // Handle DID document updates using dynamic import to avoid circular deps
        try {
            const { peerHandlers } = await import(
                '@features/messaging/hooks/usePeerHandlers'
            );
            await peerHandlers.handleIncomingDIDDocument(senderId, didDocument);
        } catch (error) {
            logger.error('Failed to handle incoming DID document', error);
        }
    }

    private async handleIncomingProfile(
        senderId: DIDString,
        profile: IMProfileMessage,
    ): Promise<void> {
        // Handle profile updates using dynamic import to avoid circular deps
        try {
            const { peerHandlers } = await import(
                '@features/messaging/hooks/usePeerHandlers'
            );
            await peerHandlers.handleIncomingProfile(senderId, profile);
        } catch (error) {
            logger.error('Failed to handle incoming profile', error);
        }
    }

    private async handleStatusUpdate(
        status: MessageStatus,
        messageIds: sha256[],
    ): Promise<void> {
        logger.debug('Received status update from library', {
            status,
            messageIds,
        });

        for (const messageId of messageIds) {
            try {
                const message = await messageService.getMessage(messageId);
                if (message) {
                    await messageService.updateMessageStatus(messageId, status);
                    logger.debug('Updated message status', {
                        messageId,
                        status,
                    });
                } else {
                    logger.warn('Could not find message for status update', {
                        messageId,
                        status,
                    });
                }
            } catch (err) {
                logger.error('Error processing status update', {
                    messageId,
                    status,
                    error: err,
                });
            }
        }
    }

    // Public API methods
    async sendMessage(
        recipientId: DIDString,
        content: string | File,
    ): Promise<SmashMessage> {
        if (!this.smashUser) {
            throw new Error('SmashOrchestrator not initialized');
        }

        const message = await messageService.sendMessage(
            this.smashUser,
            recipientId,
            content,
        );

        // Update conversation with sent message
        await this.updateConversationWithMessage(recipientId, message);

        return message;
    }

    async markMessageAsRead(messageId: string): Promise<void> {
        if (!this.smashUser) {
            throw new Error('SmashOrchestrator not initialized');
        }

        await messageService.markMessageAsRead(this.smashUser, messageId);

        // Update conversation unread count
        const message = await messageService.getMessage(messageId);
        if (message) {
            await conversationService.updateConversationUnreadCount(
                message.conversationId,
            );
        }
    }

    async markConversationAsRead(conversationId: string): Promise<void> {
        await conversationService.markConversationAsRead(conversationId);
    }

    // Delegated methods
    async getConversations(): Promise<SmashConversation[]> {
        return conversationService.getConversations();
    }

    async getMessages(conversationId: string): Promise<SmashMessage[]> {
        return messageService.getMessages(conversationId);
    }

    // Event subscription methods
    onMessageReceived(callback: (message: SmashMessage) => void): () => void {
        return messageService.onMessageReceived(callback);
    }

    onConversationUpdated(
        callback: (conversation: SmashConversation) => void,
    ): () => void {
        return conversationService.onConversationUpdated(callback);
    }

    onMessageStatusUpdated(
        callback: (messageId: string, status: MessageStatus) => void,
    ): () => void {
        return messageService.onMessageStatusUpdated(callback);
    }

    async close(): Promise<void> {
        logger.info('Closing SmashOrchestrator');

        if (this.smashUser) {
            await this.smashUser.close();
            this.smashUser = null;
        }

        await Promise.all([
            messageService.close(),
            conversationService.close(),
        ]);

        logger.debug('SmashOrchestrator closed successfully');
    }
}

export const smashOrchestrator = SmashOrchestrator.getInstance();
