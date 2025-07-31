import { useMessageStore } from '@hooks/useMessageStore';
import { peerService } from '@services/peerService';
import { smashOrchestrator } from '@services/smashOrchestrator';
import type { Profile, SmashConversation, SmashMessage } from '@smash/smash';
import { logger } from '@utils/logger';
import { create } from 'zustand';

interface ConversationState {
    conversations: SmashConversation[];
    error: Error | null;
    isLoading: boolean;
    profiles: Record<string, Profile>;
    addNewConversation: (conversation: SmashConversation) => void;
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

    markConversationAsRead: async (conversationId: string) => {
        try {
            logger.info('Marking conversation as read', { conversationId });
            await smashOrchestrator.markConversationAsRead(conversationId);
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
            let convos = await smashOrchestrator.getConversations();
            logger.debug('Loaded conversations from DB', { convos });

            // Load all messages for all conversations
            const allMessagesByConversation: Record<string, SmashMessage[]> =
                {};
            await Promise.all(
                convos.map(async (convo) => {
                    const messages = await smashOrchestrator.getMessages(
                        convo.id,
                    );
                    allMessagesByConversation[convo.id] = messages;
                }),
            );

            // Build fully-patched conversation objects
            convos = convos.map((convo) => {
                const messages = allMessagesByConversation[convo.id] || [];
                const lastMessage =
                    messages.length > 0
                        ? messages[messages.length - 1]
                        : undefined;
                const unreadCount = messages.filter(
                    (msg) => msg.sender !== 'You' && msg.status !== 'read',
                ).length;
                return {
                    ...convo,
                    lastMessage,
                    unreadCount,
                };
            });

            // Set both stores atomically
            useMessageStore.setState({
                messagesByConversation: allMessagesByConversation,
            });
            const sortedConversations = convos
                .slice()
                .sort((a, b) => b.updatedAt - a.updatedAt);
            set({ conversations: sortedConversations, isLoading: false });
            logger.debug('Conversations and messages loaded successfully', {
                count: convos.length,
                sortedConversations,
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
            const profilesFromDb = await peerService.getAllPeerProfiles();
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

    // Return cleanup function (no conversation handler needed since useMessagingHandlers handles it)
    return () => {
        logger.debug('Chat store initialized (no cleanup needed)');
    };
};
