import type { DIDString, IMMediaEmbedded } from 'smash-node-lib';

import { useChatStore } from '../hooks/useChatStore';
import { db } from '../lib/db';
import { smashService } from '../lib/smash/smash-service';
import { useMessageStore } from '../state/messageStore';
import type { SmashMessage } from '../types/smash';

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
        useChatStore
            .getState()
            .updateConversationWithMessage(conversationId, message);
    },

    handleIncomingMessage(message: SmashMessage) {
        db.addMessage(message);
        useMessageStore.getState().addMessage(message.conversationId, message);
        useChatStore
            .getState()
            .updateConversationWithMessage(message.conversationId, message);
    },

    handleMessageStatusUpdate(
        messageId: string,
        newStatus: SmashMessage['status'],
    ) {
        // look up which conversation this message belongs to (you could cache this)
        db.getMessage(messageId).then((msg) => {
            if (!msg) return;
            db.updateMessageStatus(messageId, newStatus);
            useMessageStore
                .getState()
                .updateMessageStatus(msg.conversationId, messageId, newStatus);
        });
    },
};
