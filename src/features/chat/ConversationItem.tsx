import { formatDistanceToNow } from 'date-fns';
import { Camera, Image as ImageIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

import { useChatStore } from '../../shared/hooks/useChatStore';
import type { SmashConversation } from '../../shared/types/smash';
import './conversationItem.css';

interface ConversationItemProps {
    conversation: SmashConversation;
    onQuickPhoto?: (conversationId: string) => void;
}

export function ConversationItem({
    conversation,
    onQuickPhoto,
}: Readonly<ConversationItemProps>) {
    const { id, title, lastMessage, unreadCount } = conversation;

    const profile = useChatStore((state) => state.getPeerProfile(id));

    // Format the relative time (e.g., "5 minutes ago")
    const timeAgo = lastMessage
        ? formatDistanceToNow(new Date(lastMessage.timestamp))
        : 'No messages yet';

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
                        <h3 className="conversation-title">{displayName}</h3>
                        <div className="conversation-meta">
                            <span className="conversation-time">
                                {timeAgo === 'less than a minute'
                                    ? 'just now'
                                    : timeAgo}
                            </span>
                            {/* Quick photo button */}
                            <button
                                className="photo-button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    onQuickPhoto?.(id);
                                }}
                                aria-label="Take a photo"
                            >
                                <Camera size={18} />
                            </button>
                        </div>
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
