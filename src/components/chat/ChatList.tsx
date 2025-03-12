interface ChatPreview {
    id: string;
    name: string;
    lastMessage: string;
    timestamp: Date;
    unreadCount?: number;
}

interface ChatListProps {
    chats: ChatPreview[];
    selectedChatId?: string;
    onChatSelect: (chatId: string) => void;
}

export function ChatList({
    chats,
    selectedChatId,
    onChatSelect,
}: ChatListProps) {
    return (
        <div className="overflow-y-auto flex-1">
            {chats.map((chat) => (
                <button
                    key={chat.id}
                    onClick={() => onChatSelect(chat.id)}
                    className={`chat-item ${selectedChatId === chat.id ? 'selected' : ''}`}
                >
                    <div className="chat-item-header">
                        <span className="chat-item-name">{chat.name}</span>
                        <div className="chat-item-meta">
                            {chat.unreadCount ? (
                                <span className="chat-badge">
                                    {chat.unreadCount}
                                </span>
                            ) : null}
                            <span className="chat-item-time">
                                {chat.timestamp.toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                })}
                            </span>
                        </div>
                    </div>
                    <p className="chat-item-preview">{chat.lastMessage}</p>
                </button>
            ))}
        </div>
    );
}
