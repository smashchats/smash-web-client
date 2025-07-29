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
    private processedMessageIds = new Set<string>();
    private readonly MAX_PROCESSED_MESSAGE_IDS = 1000;

    private constructor() {}

    static getInstance(): SmashOrchestrator {
        if (!SmashOrchestrator.instance) {
            SmashOrchestrator.instance = new SmashOrchestrator();
        }
        return SmashOrchestrator.instance;
    }

    init(smashUser: SmashUser): void {
        logger.info('SmashOrchestrator.init called', {
            hasExistingSmashUser: !!this.smashUser,
        });

        this.smashUser = smashUser;

        // Clear processed message IDs when reinitializing
        this.processedMessageIds.clear();
        logger.debug('🧹 Cleared processed message IDs for fresh start');

        this.setupEventListeners();
        logger.info('SmashOrchestrator initialized');
    }

    private setupEventListeners(): void {
        if (!this.smashUser) return;

        logger.info('Setting up event listeners');

        // Handle incoming chat messages
        this.smashUser.on(IM_CHAT_TEXT, this.handleIncomingMessage.bind(this));
        logger.debug('Added IM_CHAT_TEXT listener');

        this.smashUser.on(
            IM_MEDIA_EMBEDDED,
            this.handleIncomingMessage.bind(this),
        );
        logger.debug('Added IM_MEDIA_EMBEDDED listener');

        // Handle system messages
        this.smashUser.on(
            IM_DID_DOCUMENT,
            this.handleIncomingDIDDocument.bind(this),
        );
        logger.debug('Added IM_DID_DOCUMENT listener');

        this.smashUser.on(IM_PROFILE, this.handleIncomingProfile.bind(this));
        logger.debug('Added IM_PROFILE listener');

        // Handle message status updates
        this.smashUser.on('status', this.handleStatusUpdate.bind(this));
        logger.debug('Added status listener');

        logger.info('All event listeners set up');
    }

    private async handleIncomingMessage(
        senderId: DIDString,
        message: IMProtoMessage,
    ): Promise<void> {
        if (!this.smashUser) return;

        logger.info('🔔 handleIncomingMessage ENTRY', {
            senderId,
            messageId: message.sha256,
            messageType: message.type,
            timestamp: message.timestamp,
        });

        // Check if message has a valid ID for deduplication
        if (!message.sha256) {
            logger.warn('⚠️ Message without sha256 ID, cannot deduplicate', {
                senderId,
                messageType: message.type,
            });
        } else {
            // Check if we've already processed this message
            if (this.processedMessageIds.has(message.sha256)) {
                logger.warn(
                    '🚫 Duplicate message detected, skipping processing',
                    {
                        messageId: message.sha256,
                        senderId,
                    },
                );
                return;
            }

            // Mark message as processed
            this.processedMessageIds.add(message.sha256);
            logger.debug('✅ Message marked as processed', {
                messageId: message.sha256,
                totalProcessedCount: this.processedMessageIds.size,
            });

            // Clean up old message IDs if the set gets too large
            if (
                this.processedMessageIds.size > this.MAX_PROCESSED_MESSAGE_IDS
            ) {
                const idsToRemove = Array.from(this.processedMessageIds).slice(
                    0,
                    100,
                );
                idsToRemove.forEach((id) =>
                    this.processedMessageIds.delete(id),
                );
                logger.debug('🧹 Cleaned up old processed message IDs', {
                    removedCount: idsToRemove.length,
                    remainingCount: this.processedMessageIds.size,
                });
            }
        }

        try {
            // Only process actual chat messages
            if (
                message.type === IM_CHAT_TEXT ||
                message.type === IM_MEDIA_EMBEDDED
            ) {
                logger.info('📝 Processing chat message', {
                    messageId: message.sha256,
                    messageType: message.type,
                });

                const smashMessage = messageService.createSmashMessage(
                    senderId,
                    senderId, // conversation ID is the sender for direct messages
                    message,
                );

                logger.info('💾 About to store message', {
                    messageId: smashMessage.id,
                    conversationId: smashMessage.conversationId,
                });

                // Store the message
                await messageService.storeMessage(smashMessage);

                logger.info('✅ Message stored, updating conversation', {
                    messageId: smashMessage.id,
                });

                // Update or create conversation
                await this.updateConversationWithMessage(
                    senderId,
                    smashMessage,
                );

                logger.info('🎯 Successfully processed incoming chat message', {
                    messageId: smashMessage.id,
                    conversationId: smashMessage.conversationId,
                });
            } else {
                logger.debug('⏭️ Skipping non-chat message', {
                    messageType: message.type,
                    messageId: message.sha256,
                });
            }
        } catch (error) {
            logger.error('❌ Failed to handle incoming message', {
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
        logger.info('📋 updateConversationWithMessage ENTRY', {
            senderId,
            messageId: message.id,
            sender: message.sender,
        });

        let conversation = await conversationService.getConversation(senderId);

        if (!conversation) {
            logger.info('🆕 Creating new conversation', { senderId });
            // Create new conversation
            conversation = await conversationService.createConversation(
                senderId,
                message,
            );
            logger.info('✨ Created new conversation', {
                conversationId: conversation.id,
                unreadCount: conversation.unreadCount,
            });
        } else {
            logger.info('🔄 Updating existing conversation', {
                conversationId: senderId,
                currentUnreadCount: conversation.unreadCount,
                lastMessageId: conversation.lastMessage?.id,
                newMessageId: message.id,
            });
            // Update existing conversation
            conversation = await conversationService.updateConversation(
                senderId,
                message,
                true, // increment unread count
            );
            logger.info('📊 Updated conversation', {
                conversationId: conversation?.id,
                newUnreadCount: conversation?.unreadCount,
            });
        }

        if (conversation) {
            logger.info('📢 Notifying conversation callbacks', {
                conversationId: conversation.id,
                unreadCount: conversation.unreadCount,
            });
            // Notify conversation updated
            conversationService['notifyConversationCallbacks'](conversation);
        }

        logger.info('📨 Notifying message callbacks', {
            messageId: message.id,
        });
        // Notify message received
        messageService.notifyMessageCallbacks(message);

        logger.info('🏁 updateConversationWithMessage COMPLETE', {
            messageId: message.id,
            conversationId: senderId,
        });
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
