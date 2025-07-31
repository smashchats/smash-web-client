import { useChatStore } from './useChatStore';

export const useTotalUnreadCount = () => {
    const conversations = useChatStore((state) => state.conversations);

    const totalUnreadCount = conversations.reduce(
        (total, conversation) => total + (conversation.unreadCount || 0),
        0,
    );

    return totalUnreadCount;
};
