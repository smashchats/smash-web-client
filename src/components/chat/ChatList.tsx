import { DIDDocument } from 'smash-node-lib';

import { logger } from '../../lib/logger';
import { SmashConversation } from '../../lib/types';
import { NewConversationDialog } from './NewConversationDialog';

interface ChatListProps {
    conversations: SmashConversation[];
    selectedChat?: string;
    onSelectChat: (chatId: string) => void;
    onCreateConversation: (didDoc: DIDDocument) => void;
}

interface ChatItemProps {
    chat: SmashConversation;
    isSelected: boolean;
    onSelect: (chatId: string) => void;
}

function ChatItem({ chat, isSelected, onSelect }: ChatItemProps) {
    const getParticipantNames = () => {
        if (chat.type === 'direct') {
            return chat.participants.find((p) => p !== 'You') || 'Unknown';
        }
        return chat.participants.filter((p) => p !== 'You').join(', ');
    };

    const formatTime = (timestamp: Date | string) => {
        const date =
            timestamp instanceof Date ? timestamp : new Date(timestamp);
        return date.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <button
            onClick={() => onSelect(chat.id)}
            className={`chat-item ${isSelected ? 'selected' : ''}`}
        >
            <div className="chat-item-header">
                <span className="chat-item-name">{getParticipantNames()}</span>
                <div className="chat-item-meta">
                    {chat.unreadCount > 0 && (
                        <span className="chat-badge">{chat.unreadCount}</span>
                    )}
                    {chat.lastMessage && (
                        <span className="chat-item-time">
                            {formatTime(chat.lastMessage.timestamp)}
                        </span>
                    )}
                </div>
            </div>
            <p className="chat-item-preview">
                {chat.lastMessage?.content || 'No messages yet'}
            </p>
        </button>
    );
}

export function ChatList({
    conversations,
    selectedChat,
    onSelectChat,
    onCreateConversation,
}: ChatListProps) {
    const handleSelectChat = (chatId: string) => {
        logger.debug('Selecting chat', { chatId });
        onSelectChat(chatId);
    };

    const handleCreateConversation = (didDoc: DIDDocument) => {
        logger.info('Creating new conversation', { didId: didDoc.id });
        onCreateConversation(didDoc);
    };

    return (
        <div className="chat-list-container">
            <NewConversationDialog
                onCreateConversation={handleCreateConversation}
            />
            <div className="overflow-y-auto flex-1">
                {conversations.map((chat) => (
                    <ChatItem
                        key={chat.id}
                        chat={chat}
                        isSelected={selectedChat === chat.id}
                        onSelect={handleSelectChat}
                    />
                ))}
            </div>
        </div>
    );
}
