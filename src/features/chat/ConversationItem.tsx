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
                    <h3 className="conversation-title">{displayName}</h3>
                    <span className="conversation-time">
                        {timeAgo === 'less than a minute'
                            ? 'just now'
                            : timeAgo}
                    </span>
                    {/* Last message preview */}
                    <div className="conversation-message">
                        {lastMessage ? (
                            lastMessage.type === 'im.chat.text' ? (
                                lastMessage.content
                            ) : (
                                <span className="flex items-center gap-1 text-[13px] text-[var(--color-text-light)]">
                                    <ImageIcon size={16} className="inline-block align-text-bottom" /> Photo
                                </span>
                            )
                        ) : (
                            <span className="text-[var(--color-text-light)] opacity-70">No messages yet.</span>
                        )}
                    </div>
                </div>

                <div className="conversation-actions">
                    {/* Unread count */}
                    {unreadCount > 0 && (
                        <span className="unread-badge">{unreadCount}</span>
                    )}

                    {/* Quick photo button */}
                    <button
                        className="photo-button"
                        onClick={(e) => {
                            e.preventDefault();
                            onQuickPhoto?.(id);
                        }}
                        aria-label="Take a photo"
                    >
                        <Camera size={20} />
                    </button>
                </div>
            </div>
        </Link>
    );
}
