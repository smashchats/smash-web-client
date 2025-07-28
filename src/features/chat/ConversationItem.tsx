import { formatDistanceToNow } from 'date-fns';
import { Image as ImageIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

import { useChatStore } from '../../shared/hooks/useChatStore';
import type { SmashConversation } from '../../shared/types/smash';
// Styles are now handled entirely with Tailwind classes

interface ConversationItemProps {
    conversation: SmashConversation;
}

export function ConversationItem({
    conversation,
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
        <Link
            to={`/chat/${id}`}
            className="flex items-center gap-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
            {/* Avatar */}
            <div className="flex-shrink-0 h-12 w-12 rounded-full bg-violet-600/10 text-violet-700 dark:text-violet-200 flex items-center justify-center font-semibold">
                {initials}
            </div>

            {/* Main */}
            <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between">
                    <h3
                        className={`truncate ${unreadCount > 0 ? 'font-semibold text-gray-900 dark:text-gray-50' : 'font-medium text-gray-900 dark:text-gray-50'}`}
                    >
                        {displayName}
                    </h3>
                    <span className="ml-2 flex-shrink-0 text-xs text-gray-500 dark:text-gray-400">
                        {timeAgo === 'less than a minute' ? 'just now' : timeAgo}
                    </span>
                </div>

                <p className="truncate text-sm text-gray-500 dark:text-gray-400">
                    {lastMessage ? (
                        lastMessage.type === 'im.chat.text' ? (
                            lastMessage.content
                        ) : (
                            <span className="inline-flex items-center gap-1">
                                <ImageIcon size={14} /> Photo
                            </span>
                        )
                    ) : (
                        'No messages yet'
                    )}
                </p>
            </div>

            {unreadCount > 0 && (
                <span className="ml-2 inline-flex items-center justify-center h-6 min-w-6 rounded-full bg-violet-600 text-white text-xs px-1 font-semibold">
                    {unreadCount}
                </span>
            )}
        </Link>
    );
}
