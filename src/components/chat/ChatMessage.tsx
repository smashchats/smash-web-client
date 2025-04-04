import { Check, CheckCheck } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { logger } from '../../lib/logger';
import { smashService } from '../../lib/smash/smash-service';
import { SmashMessage } from '../../lib/types';
import { MediaContent } from './MediaContent';

interface ChatMessageProps {
    message: SmashMessage;
    isOwnMessage: boolean;
    peerProfile?: { title: string; description: string; avatar: string } | null;
}

interface MessageStatusIndicatorProps {
    status: SmashMessage['status'];
}

function MessageStatusIndicator({ status }: MessageStatusIndicatorProps) {
    return (
        <span className="message-status">
            {status === 'sending' && (
                <div className="dots-container">
                    <div className="spinner__dot"></div>
                    <div className="spinner__dot"></div>
                    <div className="spinner__dot"></div>
                </div>
            )}
            {status === 'delivered' && <Check className="h-3 w-3 opacity-50" />}
            {status === 'received' && (
                <CheckCheck className="h-3 w-3 opacity-50" />
            )}
            {status === 'read' && (
                <CheckCheck className="h-3 w-3 opacity-100" />
            )}
            {status === 'error' && (
                <span className="text-destructive text-xs">Error</span>
            )}
        </span>
    );
}

export function ChatMessage({ message, isOwnMessage }: ChatMessageProps) {
    const formatTime = (timestamp: number) => {
        const date = new Date(timestamp);
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

    const renderMessageContent = () => {
        switch (message.type) {
            case 'im.chat.media.embedded':
                if (typeof message.content === 'string') {
                    return (
                        <div className="message-text">{message.content}</div>
                    );
                }
                return <MediaContent data={message.content} />;
            case 'im.chat.text':
                return (
                    <div className="message-text">
                        {typeof message.content === 'string'
                            ? message.content
                            : JSON.stringify(message.content)}
                    </div>
                );
            default:
                const type = (message as { type: string }).type;
                logger.warn('Unknown message type', { type });
                return (
                    <div className="message-text">
                        Unsupported message type ({type})
                    </div>
                );
        }
    };

    // Check if message contains audio content
    const hasAudioContent =
        message.type === 'im.chat.media.embedded' &&
        typeof message.content !== 'string' &&
        message.content.mimeType.startsWith('audio/');

    return (
        <div
            ref={messageRef}
            className={`message ${isOwnMessage ? 'outgoing' : 'incoming'} ${hasAudioContent ? 'has-audio' : ''}`}
            style={hasAudioContent ? { padding: '0.75rem' } : undefined}
        >
            <div className="message-content">
                {renderMessageContent()}
                <div className="message-meta">
                    <span className="message-time">
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
