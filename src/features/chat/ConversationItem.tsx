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

    // Format the relative time (e.g., "5 minutes ago")
    const timeAgo = lastMessage ? getSmartTimestamp(new Date(lastMessage.timestamp)) : '';

    // Generate initials for avatar
    const displayName = profile?.title || title;
    const initials = displayName
        .split(' ')
        .map((word) => word.charAt(0))
        .join('')
        .substring(0, 2)
        .toUpperCase();

    return (
        <Link to={`/chat/${id}`} className="conversation-content">
            <div className="conversation-item">
                {/* Avatar */}
                <div className="avatar">{initials}</div>

                {/* Main content */}
                <div className="conversation-header">
                    <div className="conversation-header-row">
                        <h3
                            className={`conversation-title ${unreadCount > 0 ? 'font-semibold' : ''}`}
                        >
                            {displayName}
                        </h3>
                        <span className="conversation-time">{timeAgo}</span>
                    </div>
                    {/* Last message preview */}
                    <div className="conversation-message">
                        {lastMessage ? (
                            lastMessage.type === 'im.chat.text' ? (
                                lastMessage.content
                            ) : (
                                <span className="conversation-message-media">
                                    <ImageIcon size={14} /> Photo
                                </span>
                            )
                        ) : (
                            <span className="conversation-message-empty">No messages yet</span>
                        )}
                    </div>
                </div>

                {/* Unread count */}
                {unreadCount > 0 && (
                    <div className="conversation-actions">
                        <span className="unread-badge">{unreadCount}</span>
                    </div>
                )}
            </div>
        </Link>
    );
}

// Util -----------------------------------------------------------
function getSmartTimestamp(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();

    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) {
        return `${diffSec}s`;
    }

    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) {
        return `${diffMin}mn`;
    }

    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 20) {
        return date.toLocaleTimeString(undefined, {
            hour: '2-digit',
            minute: '2-digit',
        });
    }

    return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
    });
}
