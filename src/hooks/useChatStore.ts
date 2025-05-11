import { create } from 'zustand';

import { logger } from '../lib/logger';
import { smashService } from '../lib/smash/smash-service';
import type { Profile, SmashConversation, SmashMessage } from '../types/smash';

interface ConversationState {
    conversations: SmashConversation[];
    error: Error | null;
    isLoading: boolean;
    profiles: Record<string, Profile>;
    addNewConversation: (conversation: SmashConversation) => void;
    updateConversationWithMessage: (
        conversationId: string,
        lastMessage: SmashMessage,
    ) => void;
    markConversationAsRead: (conversationId: string) => Promise<void>;
    refreshConversations: () => Promise<void>;
    getPeerProfile: (peerId: string) => Profile | undefined;
    setPeerProfile: (peerId: string, profile: Profile) => void;
    initAllPeers: () => Promise<void>;
}

export const useChatStore = create<ConversationState>((set, get) => ({
    conversations: [],
    error: null,
    isLoading: false,
    profiles: {},

    addNewConversation: (conversation: SmashConversation) => {
        logger.debug('Adding new conversation', {
            conversationId: conversation.id,
        });
        set((state) => {
            const updated = [...state.conversations, conversation];
            return {
                conversations: updated
                    .slice()
                    .sort((a, b) => b.updatedAt - a.updatedAt),
            };
        });
    },

    updateConversationWithMessage: (
        conversationId: string,
        lastMessage: SmashMessage,
    ) => {
        logger.debug('Updating conversation with new message', {
            conversationId,
            messageId: lastMessage.id,
        });
        set((state) => {
            const updated = state.conversations.map((conv) =>
                conv.id === conversationId
                    ? {
                          ...conv,
                          lastMessage,
                          unreadCount: conv.unreadCount || 0,
                          updatedAt: lastMessage.timestamp,
                      }
                    : conv,
            );
            return {
                conversations: updated
                    .slice()
                    .sort((a, b) => b.updatedAt - a.updatedAt),
            };
        });
    },

    markConversationAsRead: async (conversationId: string) => {
        try {
            logger.info('Marking conversation as read', { conversationId });
            await smashService.markConversationAsRead(conversationId);
            logger.debug('Conversation marked as read successfully');
        } catch (err) {
            const error =
                err instanceof Error
                    ? err
                    : new Error('Failed to mark conversation as read');
            logger.error('Failed to mark conversation as read', error);
            throw error;
        }
    },

    refreshConversations: async () => {
        try {
            logger.info('Loading conversations');
            set({ error: null, isLoading: true });
            const convos = await smashService.getConversations();
            const sortedConversations = convos
                .slice()
                .sort((a, b) => b.updatedAt - a.updatedAt);
            set({ conversations: sortedConversations, isLoading: false });
            logger.debug('Conversations loaded successfully', {
                count: convos.length,
            });
        } catch (err) {
            const error =
                err instanceof Error
                    ? err
                    : new Error('Failed to load conversations');
            logger.error('Failed to load conversations', error);
            set({ error, isLoading: false });
        }
    },

    getPeerProfile: (peerId: string) => {
        return get().profiles[peerId];
    },

    setPeerProfile: (peerId: string, profile: Profile) => {
        set((state) => ({
            profiles: {
                ...state.profiles,
                [peerId]: profile,
            },
        }));
    },

    initAllPeers: async () => {
        try {
            logger.info('Initializing all peer profiles from DB');
            const profilesFromDb = await smashService.getAllPeerProfiles();
            set((state) => ({
                profiles: { ...state.profiles, ...profilesFromDb },
                error: null,
            }));
            logger.debug('Successfully initialized peer profiles', {
                count: Object.keys(profilesFromDb).length,
            });
        } catch (err) {
            const error =
                err instanceof Error
                    ? err
                    : new Error('Failed to initialize peer profiles');
            logger.error('Failed to initialize peer profiles', error);
            set({ error });
        }
    },
}));

// Initialize the store and set up event listeners
export const initializeChatStore = () => {
    const store = useChatStore.getState();

    // Load initial conversations
    store.refreshConversations();
    store.initAllPeers();

    // Set up conversation update listener
    const handleConversationUpdate = (conversation: SmashConversation) => {
        logger.info('Conversation updated', {
            conversationId: conversation.id,
        });
        const state = useChatStore.getState();
        const existing = state.conversations.find(
            (c) => c.id === conversation.id,
        );

        if (existing) {
            // Update existing conversation
            const updated = state.conversations.map((c) =>
                c.id === conversation.id ? conversation : c,
            );
            useChatStore.setState({
                conversations: updated
                    .slice()
                    .sort((a, b) => b.updatedAt - a.updatedAt),
            });
        } else {
            // Add new conversation
            store.addNewConversation(conversation);
        }
    };

    smashService.onConversationUpdated(handleConversationUpdate);

    // Return cleanup function
    return () => {
        logger.debug('Cleaning up conversation handlers');
        smashService.offConversationUpdated(handleConversationUpdate);
    };
};
