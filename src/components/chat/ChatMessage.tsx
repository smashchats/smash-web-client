import { Check, CheckCheck } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { logger } from '../../lib/logger';
import { smashService } from '../../lib/smash/smash-service';
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
        <span className="flex items-center text-xs text-muted-foreground">
            {status === 'sent' && <Check className="h-3 w-3 opacity-50" />}
            {status === 'delivered' && (
                <CheckCheck className="h-3 w-3 opacity-50" />
            )}
            {status === 'read' && (
                <CheckCheck className="h-3 w-3 opacity-100" />
            )}
            {status === 'failed' && (
                <span className="text-destructive text-xs">Failed</span>
            )}
            {status === 'error' && (
                <span className="text-destructive text-xs">Error</span>
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

    // Use ref for the message element
    const messageRef = useRef<HTMLDivElement>(null);
    // Track if the user has interacted with the conversation
    const [hasUserInteracted, setHasUserInteracted] = useState(false);

    // Track user interaction with the conversation
    useEffect(() => {
        const handleInteraction = () => {
            if (!hasUserInteracted) {
                logger.debug('User interacted with conversation');
                setHasUserInteracted(true);
            }
        };

        // Listen for user interactions
        window.addEventListener('mousemove', handleInteraction);
        window.addEventListener('keydown', handleInteraction);
        window.addEventListener('click', handleInteraction);
        window.addEventListener('scroll', handleInteraction);

        return () => {
            window.removeEventListener('mousemove', handleInteraction);
            window.removeEventListener('keydown', handleInteraction);
            window.removeEventListener('click', handleInteraction);
            window.removeEventListener('scroll', handleInteraction);
        };
    }, [hasUserInteracted]);

    // Mark message as read when it becomes visible and user has interacted
    useEffect(() => {
        if (!isOwnMessage && message.status !== 'read' && hasUserInteracted) {
            const element = messageRef.current;
            const observer = new IntersectionObserver(
                (entries) => {
                    entries.forEach((entry) => {
                        if (entry.isIntersecting) {
                            logger.debug(
                                'Message became visible and user has interacted, marking as read',
                                {
                                    messageId: message.id,
                                    status: message.status,
                                    sender: message.sender,
                                },
                            );
                            // Check if service is initialized before marking as read
                            try {
                                void smashService.markMessageAsRead(message.id);
                            } catch (error) {
                                logger.warn(
                                    'Failed to mark message as read - service not initialized',
                                    {
                                        messageId: message.id,
                                        error,
                                    },
                                );
                                // Retry after a short delay
                                setTimeout(() => {
                                    try {
                                        void smashService.markMessageAsRead(
                                            message.id,
                                        );
                                    } catch (retryError) {
                                        logger.error(
                                            'Failed to mark message as read after retry',
                                            {
                                                messageId: message.id,
                                                error: retryError,
                                            },
                                        );
                                    }
                                }, 1000);
                            }
                            // Unobserve after marking as read
                            observer.unobserve(entry.target);
                        }
                    });
                },
                {
                    threshold: 0.5, // Message is considered read when 50% visible
                    rootMargin: '50px', // Start observing slightly before the message comes into view
                },
            );

            if (element) {
                observer.observe(element);
            }

            return () => {
                if (element) {
                    observer.unobserve(element);
                }
            };
        }
    }, [
        message.id,
        message.status,
        isOwnMessage,
        message.sender,
        hasUserInteracted,
    ]);

    logger.debug('Rendering chat message', {
        messageId: message.id,
        isOwnMessage,
        status: message.status,
        hasUserInteracted,
    });

    return (
        <div
            ref={messageRef}
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
