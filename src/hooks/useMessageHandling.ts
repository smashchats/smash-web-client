import { useEffect, useRef, useState } from 'react';
import { DIDString, IMMediaEmbedded } from 'smash-node-lib';

import { CURRENT_USER } from '../config/constants';
import { logger } from '../lib/logger';
import { smashService } from '../lib/smash/smash-service';
import { SmashMessage } from '../lib/types';

interface UseMessageHandlingProps {
    selectedChat?: string;
    onConversationUpdate: (
        conversationId: string,
        lastMessage: SmashMessage,
    ) => void;
}

// Valid status transitions for message states
const validStatusTransitions: Record<
    SmashMessage['status'],
    SmashMessage['status'][]
> = {
    sending: ['delivered', 'received', 'read', 'error'],
    delivered: ['received', 'read', 'error', 'sending'],
    received: ['read'],
    read: [],
    error: ['sending', 'delivered', 'received', 'read'],
};

// Sort messages chronologically
const sortMessagesByTimestamp = (messages: SmashMessage[]): SmashMessage[] => {
    return [...messages].sort((a, b) => a.timestamp - b.timestamp);
};

export const useMessageHandling = ({
    selectedChat,
    onConversationUpdate,
}: UseMessageHandlingProps) => {
    const [messages, setMessages] = useState<SmashMessage[]>([]);
    const [error, setError] = useState<Error | null>(null);
    const conversationUpdateRef = useRef(onConversationUpdate);

    // Keep ref in sync with latest callback
    useEffect(() => {
        conversationUpdateRef.current = onConversationUpdate;
    }, [onConversationUpdate]);

    // Load messages when chat changes
    useEffect(() => {
        if (!selectedChat) {
            logger.debug('No chat selected, clearing messages');
            setMessages([]);
            return;
        }

        const loadMessages = async () => {
            logger.info('Loading messages', { conversationId: selectedChat });

            try {
                setError(null);
                const loadedMessages =
                    await smashService.getMessages(selectedChat);
                setMessages(sortMessagesByTimestamp(loadedMessages));

                logger.info('Messages loaded successfully', {
                    conversationId: selectedChat,
                    messageCount: loadedMessages.length,
                });
            } catch (err) {
                const error =
                    err instanceof Error
                        ? err
                        : new Error('Failed to load messages');
                logger.error('Failed to load messages', {
                    conversationId: selectedChat,
                    error: error.message,
                });
                setError(error);
            }
        };

        loadMessages();
    }, [selectedChat]);

    // Handle incoming messages and status updates
    useEffect(() => {
        const handleNewMessage = (message: SmashMessage) => {
            // Ignore own messages
            if (message.sender === CURRENT_USER) {
                logger.debug('Ignoring own message', { messageId: message.id });
                return;
            }

            logger.info('New message received', {
                messageId: message.id,
                conversationId: message.conversationId,
            });

            // Only handle messages for current chat
            if (message.conversationId === selectedChat) {
                setMessages((prev) => {
                    // Avoid duplicates
                    if (prev.some((m) => m.id === message.id)) {
                        logger.debug('Duplicate message ignored', {
                            messageId: message.id,
                        });
                        return prev;
                    }

                    const updated = sortMessagesByTimestamp([...prev, message]);
                    logger.debug('Message added to conversation', {
                        messageId: message.id,
                        totalMessages: updated.length,
                    });
                    return updated;
                });

                conversationUpdateRef.current(message.conversationId, message);
            } else {
                logger.debug('Message for different conversation', {
                    messageId: message.id,
                    messageConversationId: message.conversationId,
                    currentConversationId: selectedChat,
                });
            }
        };

        const handleMessageStatusUpdate = (
            messageId: string,
            newStatus: SmashMessage['status'],
        ) => {
            logger.debug('Processing status update', {
                messageId,
                newStatus,
            });

            setMessages((prev) => {
                const message = prev.find((msg) => msg.id === messageId);

                if (!message) {
                    logger.debug('Message not found for status update', {
                        messageId,
                    });
                    return prev;
                }

                const isValidTransition =
                    validStatusTransitions[message.status]?.includes(newStatus);

                if (!isValidTransition) {
                    logger.warn('Invalid status transition ignored', {
                        messageId,
                        currentStatus: message.status,
                        attemptedStatus: newStatus,
                    });
                    return prev;
                }

                logger.info('Updating message status', {
                    messageId,
                    fromStatus: message.status,
                    toStatus: newStatus,
                });

                return prev.map((msg) =>
                    msg.id === messageId ? { ...msg, status: newStatus } : msg,
                );
            });
        };

        // Set up event listeners
        logger.debug('Setting up message handlers', { selectedChat });
        smashService.onMessageReceived(handleNewMessage);
        smashService.onMessageStatusUpdated(handleMessageStatusUpdate);

        return () => {
            logger.debug('Cleaning up message handlers', { selectedChat });
            smashService.offMessageReceived(handleNewMessage);
            smashService.offMessageStatusUpdated(handleMessageStatusUpdate);
        };
    }, [selectedChat]);

    const sendMessage = async (content: string | IMMediaEmbedded) => {
        if (!selectedChat) {
            logger.warn('Attempted to send message with no chat selected');
            return;
        }

        const contentType = typeof content === 'string' ? 'text' : 'media';
        logger.info('Sending message', {
            conversationId: selectedChat,
            type: contentType,
        });

        try {
            setError(null);
            const message = await smashService.sendMessage(
                selectedChat as DIDString,
                content,
            );

            setMessages((prev) => {
                if (prev.some((m) => m.id === message.id)) {
                    logger.debug('Duplicate message prevented', {
                        messageId: message.id,
                    });
                    return prev;
                }

                const updated = sortMessagesByTimestamp([...prev, message]);
                logger.debug('Message added to conversation', {
                    messageId: message.id,
                    totalMessages: updated.length,
                });
                return updated;
            });

            conversationUpdateRef.current(selectedChat, message);

            logger.info('Message sent successfully', {
                messageId: message.id,
                conversationId: selectedChat,
            });
        } catch (err) {
            const error =
                err instanceof Error
                    ? err
                    : new Error('Failed to send message');
            logger.error('Failed to send message', {
                conversationId: selectedChat,
                error: error.message,
            });
            setError(error);
        }
    };

    return {
        messages,
        error,
        sendMessage,
    };
};
