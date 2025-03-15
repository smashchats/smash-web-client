import { DIDDocument } from 'smash-node-lib';

import { SmashConversation } from '../../lib/types';
import { NewConversationDialog } from './NewConversationDialog';

interface ChatListProps {
    conversations: SmashConversation[];
    selectedChat?: string;
    onSelectChat: (chatId: string) => void;
    onCreateConversation: (didDoc: DIDDocument) => void;
}

export function ChatList({
    conversations,
    selectedChat,
    onSelectChat,
    onCreateConversation,
}: ChatListProps) {
    return (
        <div className="chat-list-container">
            <NewConversationDialog
                onCreateConversation={onCreateConversation}
            />
            <div className="overflow-y-auto flex-1">
                {conversations.map((chat) => (
                    <button
                        key={chat.id}
                        onClick={() => onSelectChat(chat.id)}
                        className={`chat-item ${selectedChat === chat.id ? 'selected' : ''}`}
                    >
                        <div className="chat-item-header">
                            <span className="chat-item-name">
                                {chat.type === 'direct'
                                    ? chat.participants.find(
                                          (p) => p !== 'You',
                                      ) || 'Unknown'
                                    : chat.participants
                                          .filter((p) => p !== 'You')
                                          .join(', ')}
                            </span>
                            <div className="chat-item-meta">
                                {chat.unreadCount > 0 && (
                                    <span className="chat-badge">
                                        {chat.unreadCount}
                                    </span>
                                )}
                                {chat.lastMessage && (
                                    <span className="chat-item-time">
                                        {new Date(
                                            chat.lastMessage.timestamp,
                                        ).toLocaleTimeString([], {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })}
                                    </span>
                                )}
                            </div>
                        </div>
                        <p className="chat-item-preview">
                            {chat.lastMessage?.content || 'No messages yet'}
                        </p>
                    </button>
                ))}
            </div>
        </div>
    );
}
