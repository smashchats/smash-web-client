import { create } from 'zustand';

import type { SmashMessage } from '../types/smash';

type MessageStore = {
    messagesByConversation: Record<string, SmashMessage[]>;
    setMessages: (conversationId: string, messages: SmashMessage[]) => void;
    addMessage: (conversationId: string, message: SmashMessage) => void;
    updateMessageStatus: (
        conversationId: string,
        messageId: string,
        status: SmashMessage['status'],
    ) => void;
};

export const useMessageStore = create<MessageStore>((set) => ({
    messagesByConversation: {},

    setMessages: (conversationId, messages) =>
        set((state) => ({
            messagesByConversation: {
                ...state.messagesByConversation,
                [conversationId]: messages,
            },
        })),

    addMessage: (conversationId, message) =>
        set((state) => {
            const existing = state.messagesByConversation[conversationId] ?? [];
            if (existing.some((m) => m.id === message.id)) return state;
            return {
                messagesByConversation: {
                    ...state.messagesByConversation,
                    [conversationId]: [...existing, message].sort(
                        (a, b) => a.timestamp - b.timestamp,
                    ),
                },
            };
        }),

    updateMessageStatus: (conversationId, messageId, status) =>
        set((state) => {
            const messages = state.messagesByConversation[conversationId];
            if (!messages) return state;
            return {
                messagesByConversation: {
                    ...state.messagesByConversation,
                    [conversationId]: messages.map((msg) =>
                        msg.id === messageId ? { ...msg, status } : msg,
                    ),
                },
            };
        }),
}));
