import { Check, CheckCheck } from 'lucide-react';

import { SmashMessage } from '../../lib/types';

interface ChatMessageProps {
    message: SmashMessage;
    isOwnMessage: boolean;
}

export function ChatMessage({ message, isOwnMessage }: ChatMessageProps) {
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
                        {new Date(message.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                        })}
                    </span>
                    {isOwnMessage && (
                        <span className="flex items-center">
                            {message.status === 'sent' && (
                                <Check className="h-3 w-3 opacity-70" />
                            )}
                            {message.status === 'delivered' && (
                                <CheckCheck className="h-3 w-3 opacity-70" />
                            )}
                            {message.status === 'read' && (
                                <CheckCheck className="h-3 w-3 text-blue-400" />
                            )}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
