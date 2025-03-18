import { Check, CheckCheck } from 'lucide-react';

import { logger } from '../../lib/logger';
import { SmashMessage } from '../../lib/types';

interface ChatMessageProps {
    message: SmashMessage;
    isOwnMessage: boolean;
}

interface MessageStatusIndicatorProps {
    status: SmashMessage['status'];
}

function MessageStatusIndicator({ status }: MessageStatusIndicatorProps) {
    return (
        <span className="flex items-center">
            {status === 'sent' && <Check className="h-3 w-3 opacity-70" />}
            {status === 'delivered' && (
                <CheckCheck className="h-3 w-3 opacity-70" />
            )}
            {status === 'read' && (
                <CheckCheck className="h-3 w-3 text-blue-400" />
            )}
        </span>
    );
}

export function ChatMessage({ message, isOwnMessage }: ChatMessageProps) {
    const formatTime = (timestamp: Date | string) => {
        const date =
            timestamp instanceof Date ? timestamp : new Date(timestamp);
        return date.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    logger.debug('Rendering chat message', {
        messageId: message.id,
        isOwnMessage,
        status: message.status,
    });

    return (
        <div
            className={`message ${isOwnMessage ? 'outgoing ml-auto' : 'incoming'}`}
        >
            {!isOwnMessage && (
                <div className="font-medium text-sm text-muted mb-1">
                    {message.sender}
                </div>
            )}
            <div className="flex flex-col">
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                <div className="flex items-center gap-1 mt-1">
                    <span className="text-xs opacity-70">
                        {formatTime(message.timestamp)}
                    </span>
                    {isOwnMessage && (
                        <MessageStatusIndicator status={message.status} />
                    )}
                </div>
            </div>
        </div>
    );
}
