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
        db.addMessage(message);
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
