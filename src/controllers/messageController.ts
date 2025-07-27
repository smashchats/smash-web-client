import { db } from '@src/services/db';
import { smashService } from '@src/services/smashService';
import { useMessageStore } from '@src/shared/hooks/useMessageStore';
import type { SmashMessage } from '@src/shared/types/smash';
import { logger } from '@src/shared/utils/logger';
import type { DIDString, IMMediaEmbedded } from 'smash-node-lib';

export const messageController = {
    async loadMessages(conversationId: string) {
        const messages = await smashService.getMessages(conversationId);
        useMessageStore.getState().setMessages(conversationId, messages);
    },

    async sendMessage(
        conversationId: DIDString,
        content: string | IMMediaEmbedded,
    ) {
        const message = await smashService.sendMessage(conversationId, content);
        useMessageStore.getState().addMessage(conversationId, message);
    },

    handleIncomingMessage(message: SmashMessage) {
        logger.info('MessageController: Handling incoming message', {
            messageId: message.id,
            conversationId: message.conversationId,
        });
        // Message is already stored by smashService, just update UI store
        useMessageStore.getState().addMessage(message.conversationId, message);
    },

    handleMessageStatusUpdate(
        messageId: string,
        newStatus: SmashMessage['status'],
    ) {
        // look up which conversation this message belongs to (you could cache this)
        logger.debug('handleMessageStatusUpdate called', {
            messageId,
            newStatus,
        });
        db.getMessage(messageId).then((msg) => {
            if (!msg) {
                logger.warn('Message not found in DB for status update', {
                    messageId,
                    newStatus,
                });
                return;
            }
            db.updateMessageStatus(messageId, newStatus);
            logger.debug('Updating Zustand message store status', {
                conversationId: msg.conversationId,
                messageId,
                newStatus,
            });
            useMessageStore
                .getState()
                .updateMessageStatus(msg.conversationId, messageId, newStatus);
        });
    },
};

// Initialize message listeners
export const initializeMessageController = () => {
    logger.info('Initializing message controller listeners');

    // Set up message received listener
    const handleIncomingMessage = (message: SmashMessage) => {
        messageController.handleIncomingMessage(message);
    };

    // Set up message status update listener
    const handleStatusUpdate = (
        messageId: string,
        status: SmashMessage['status'],
    ) => {
        messageController.handleMessageStatusUpdate(messageId, status);
    };

    smashService.onMessageReceived(handleIncomingMessage);
    smashService.onMessageStatusUpdated(handleStatusUpdate);

    logger.info('Message controller listeners initialized');

    // Return cleanup function
    return () => {
        logger.debug('Cleaning up message controller listeners');
        smashService.offMessageReceived(handleIncomingMessage);
        smashService.offMessageStatusUpdated(handleStatusUpdate);
    };
};
