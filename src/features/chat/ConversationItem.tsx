import { Image as ImageIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

import { useChatStore } from '../../shared/hooks/useChatStore';
import type { SmashConversation } from '../../shared/types/smash';
import './conversationItem.css';

interface ConversationItemProps {
    conversation: SmashConversation;
}

export function ConversationItem({
    conversation,
}: Readonly<ConversationItemProps>) {
    const { id, title, lastMessage, unreadCount } = conversation;

    const profile = useChatStore((state) => state.getPeerProfile(id));

    // Format the time according to requirements
    const formatTimestamp = (timestamp: number) => {
        const now = new Date();
        const messageTime = new Date(timestamp);
        const diffInMinutes = Math.floor(
            (now.getTime() - messageTime.getTime()) / (1000 * 60),
        );

        if (diffInMinutes < 1) {
            return 'now';
        } else if (diffInMinutes < 60) {
            return `${diffInMinutes}m`;
        }

        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 20) {
            return messageTime.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
            });
        }

        // For messages older than 20 hours, show month and day
        return messageTime.toLocaleDateString([], {
            month: 'short',
            day: 'numeric',
        });
    };

    const timeDisplay = lastMessage
        ? formatTimestamp(lastMessage.timestamp)
        : '';

    // Generate initials for avatar
    const displayName = profile?.title || title;
    const initials = displayName
        .split(' ')
        .map((word) => word.charAt(0))
        .join('')
        .substring(0, 2)
        .toUpperCase();

    // Truncate message preview
    const getMessagePreview = () => {
        if (!lastMessage) return 'No messages yet';

        if (lastMessage.type === 'im.chat.text') {
            return lastMessage.content.length > 50
                ? `${lastMessage.content.substring(0, 50)}...`
                : lastMessage.content;
        } else {
            return 'Photo';
        }
    };

    return (
        <Link to={`/chat/${id}`} className="conversation-item-link">
            <div
                className={`conversation-item ${unreadCount > 0 ? 'conversation-item--unread' : ''}`}
            >
                {/* Avatar */}
                <div className="conversation-avatar">
                    <span className="conversation-avatar-text">{initials}</span>
                </div>

                {/* Main content */}
                <div className="conversation-main">
                    <div className="conversation-header">
                        <h3 className="conversation-name">{displayName}</h3>
                        <div className="conversation-time">{timeDisplay}</div>
                    </div>

                    <div className="conversation-footer">
                        <div className="conversation-preview">
                            {lastMessage?.type === 'im.chat.text' ? (
                                <span className="conversation-preview-text">
                                    {getMessagePreview()}
                                </span>
                            ) : lastMessage ? (
                                <div className="conversation-preview-media">
                                    <ImageIcon size={14} />
                                    <span>Photo</span>
                                </div>
                            ) : (
                                <span className="conversation-preview-empty">
                                    No messages yet
                                </span>
                            )}
                        </div>

                        {unreadCount > 0 && (
                            <div className="conversation-unread-badge">
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Link>
    );
}
