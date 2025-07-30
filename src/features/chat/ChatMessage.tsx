import { smashOrchestrator } from '@services/smashOrchestrator';
import type { SmashMessage } from '@shared/types/smash';
import { logger } from '@shared/utils/logger';
import { Check, CheckCheck } from 'lucide-react';
import { forwardRef, useEffect, useRef, useState } from 'react';

import './ChatMessage.css';
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
    const statusIcons = {
        sending: (
            <div className="dots-container">
                <div className="spinner__dot"></div>
                <div className="spinner__dot"></div>
                <div className="spinner__dot"></div>
            </div>
        ),
        delivered: <Check className="opacity-50" />,
        received: <CheckCheck className="opacity-50" />,
        read: <CheckCheck className="opacity-100" />,
        error: <span className="text-destructive text-xs">Error</span>,
    };

    return <span className="message-status">{statusIcons[status]}</span>;
}

export const ChatMessage = forwardRef<HTMLDivElement, ChatMessageProps>(
    ({ message, isOwnMessage }, ref) => {
        const messageRef = useRef<HTMLDivElement>(null);
        const [hasUserInteracted, setHasUserInteracted] = useState(false);

        // Use the forwarded ref if provided, otherwise use the local ref
        const finalRef = ref || messageRef;

        const formatTime = (timestamp: number) => {
            return new Date(timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
            });
        };

        useEffect(() => {
            const handleInteraction = () => {
                if (!hasUserInteracted) {
                    logger.debug('User interacted with conversation');
                    setHasUserInteracted(true);
                }
            };

            const interactionEvents = [
                'mousemove',
                'keydown',
                'click',
                'scroll',
            ];
            interactionEvents.forEach((event) =>
                window.addEventListener(event, handleInteraction),
            );

            return () => {
                interactionEvents.forEach((event) =>
                    window.removeEventListener(event, handleInteraction),
                );
            };
        }, [hasUserInteracted]);

        useEffect(() => {
            if (
                !isOwnMessage &&
                message.status !== 'read' &&
                hasUserInteracted
            ) {
                const element =
                    finalRef && typeof finalRef === 'object'
                        ? finalRef.current
                        : messageRef.current;
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
                                const markAsRead = () => {
                                    logger.debug(
                                        'Calling smashOrchestrator.markMessageAsRead',
                                        { messageId: message.id },
                                    );
                                    try {
                                        void smashOrchestrator.markMessageAsRead(
                                            message.id,
                                        );
                                    } catch (error) {
                                        logger.error(
                                            'Failed to mark message as read',
                                            {
                                                messageId: message.id,
                                                error,
                                            },
                                        );
                                    }
                                };

                                // debounce
                                setTimeout(markAsRead, 300);

                                observer.unobserve(entry.target);
                            }
                        });
                    },
                    {
                        threshold: 0.95,
                        rootMargin: '50px',
                    },
                );

                if (element) {
                    logger.debug('Observing message element for read status', {
                        messageId: message.id,
                    });
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
            finalRef,
        ]);

        const hasAudioContent =
            message.type === 'im.chat.media.embedded' &&
            typeof message.content !== 'string' &&
            message.content.mimeType.startsWith('audio/');

        useEffect(() => {
            if (hasAudioContent) {
                const timer = setTimeout(() => {
                    setHasUserInteracted((prev) => !prev);
                    setTimeout(() => setHasUserInteracted((prev) => !prev), 50);
                }, 100);

                return () => clearTimeout(timer);
            }
        }, [hasAudioContent, message.id]);

        logger.debug('Rendering chat message', {
            messageId: message.id,
            isOwnMessage,
            status: message.status,
            hasUserInteracted,
        });

        const renderMessageContent = () => {
            const type = message.type;
            switch (type) {
                case 'im.chat.media.embedded':
                    return typeof message.content === 'string' ? (
                        <div className="message-text">{message.content}</div>
                    ) : (
                        <MediaContent data={message.content} />
                    );
                case 'im.chat.text':
                    return (
                        <div className="message-text">
                            {typeof message.content === 'string'
                                ? message.content
                                : JSON.stringify(message.content)}
                        </div>
                    );
                default:
                    logger.warn('Unknown message type', { type });
                    return (
                        <div className="message-text">
                            Unsupported message type ({type})
                        </div>
                    );
            }
        };

        return (
            <div
                ref={finalRef}
                data-message-id={message.id}
                className={`message ${isOwnMessage ? 'outgoing' : 'incoming'} ${hasAudioContent ? 'has-audio' : ''} ${!isOwnMessage && message.status !== 'read' ? 'unread' : ''}`}
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
    },
);
