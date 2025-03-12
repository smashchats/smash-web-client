import { Check, CheckCheck } from 'lucide-react';

interface ChatMessageProps {
    content: string;
    isOutgoing: boolean;
    timestamp: Date;
    sender: string;
    status?: 'sent' | 'delivered' | 'read' | 'failed';
}

export function ChatMessage({
    content,
    isOutgoing,
    timestamp,
    sender,
    status = 'sent',
}: ChatMessageProps) {
    return (
        <div
            className={`message ${isOutgoing ? 'outgoing ml-auto' : 'incoming'}`}
        >
            {!isOutgoing && (
                <div className="font-medium text-sm text-muted mb-1">
                    {sender}
                </div>
            )}
            <div className="flex flex-col">
                <p className="text-sm whitespace-pre-wrap">{content}</p>
                <div className="flex items-center gap-1 mt-1">
                    <span className="text-xs opacity-70">
                        {timestamp.toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                        })}
                    </span>
                    {isOutgoing && (
                        <span className="flex items-center">
                            {status === 'sent' && (
                                <Check className="h-3 w-3 opacity-70" />
                            )}
                            {status === 'delivered' && (
                                <CheckCheck className="h-3 w-3 opacity-70" />
                            )}
                            {status === 'read' && (
                                <CheckCheck className="h-3 w-3 text-blue-400" />
                            )}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
