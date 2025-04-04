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

// Sort messages by timestamp in ascending order
const sortMessages = (messages: SmashMessage[]): SmashMessage[] => {
    return [...messages].sort((a, b) => a.timestamp - b.timestamp);
};

export const useMessageHandling = ({
    selectedChat,
    onConversationUpdate,
}: UseMessageHandlingProps) => {
    const [messages, setMessages] = useState<SmashMessage[]>([]);
    const [error, setError] = useState<Error | null>(null);
    const conversationUpdateRef = useRef(onConversationUpdate);

    // Update the ref when the callback changes
    useEffect(() => {
        conversationUpdateRef.current = onConversationUpdate;
    }, [onConversationUpdate]);

    useEffect(() => {
        if (!selectedChat) {
            setMessages([]);
            return;
        }

        const loadMessages = async () => {
            try {
                logger.info('Loading messages for conversation', {
                    conversationId: selectedChat,
                });
                setError(null);
                const msgs = await smashService.getMessages(selectedChat);
                setMessages(sortMessages(msgs));
                logger.debug('Messages loaded successfully', {
                    count: msgs.length,
                });
            } catch (err) {
                const error =
                    err instanceof Error
                        ? err
                        : new Error('Failed to load messages');
                logger.error('Failed to load messages', error);
                setError(error);
            }
        };

        loadMessages();
    }, [selectedChat]);

    useEffect(() => {
        const handleNewMessage = (message: SmashMessage) => {
            // Only handle incoming messages (not our own)
            if (message.sender === CURRENT_USER) return;

            logger.info('Received new message', { messageId: message.id });

            // Only add the message if it belongs to the current conversation
            if (message.conversationId === selectedChat) {
                setMessages((prev) => {
                    // Check if we already have this message to avoid duplicates
                    if (!prev.some((m) => m.id === message.id)) {
                        const updated = [...prev, message];
                        return sortMessages(updated);
                    }
                    return prev;
                });
                conversationUpdateRef.current(message.conversationId, message);
            } else {
                logger.debug('Received message for different conversation', {
                    messageConversationId: message.conversationId,
                    currentConversationId: selectedChat,
                });
            }
        };

        const handleMessageStatusUpdate = (
            messageId: string,
            status: SmashMessage['status'],
        ) => {
            logger.debug('Message status updated in hook', {
                messageId,
                status,
            });

            setMessages((prev) => {
                // Only update if the message exists in our current state
                const hasMessage = prev.some((msg) => msg.id === messageId);

                if (hasMessage) {
                    return prev.map((msg) =>
                        msg.id === messageId ? { ...msg, status } : msg,
                    );
                } else {
                    // If no message found with this ID, just leave the state as is
                    logger.debug('No message found with ID for status update', {
                        messageId,
                        status,
                        messageCount: prev.length,
                    });
                    return prev;
                }
            });
        };

        // Set up message handling
        smashService.onMessageReceived(handleNewMessage);
        smashService.onMessageStatusUpdated(handleMessageStatusUpdate);

        return () => {
            // Cleanup listeners
            logger.debug('Cleaning up message handlers');
            smashService.offMessageReceived(handleNewMessage);
            smashService.offMessageStatusUpdated(handleMessageStatusUpdate);
        };
    }, [selectedChat]);

    const sendMessage = async (content: string | IMMediaEmbedded) => {
        if (!selectedChat) return;

        try {
            logger.info('Sending message', {
                conversationId: selectedChat,
                type: typeof content === 'string' ? 'text' : 'media',
            });
            setError(null);

            const message = await smashService.sendMessage(
                selectedChat as DIDString,
                content,
            );

            setMessages((prev) => {
                // Check if we already have this message to avoid duplicates
                if (!prev.some((m) => m.id === message.id)) {
                    return sortMessages([...prev, message]);
                }
                return prev;
            });

            conversationUpdateRef.current(selectedChat, message);

            logger.debug('Message sending initiated', {
                messageId: message.id,
            });
        } catch (err) {
            const error =
                err instanceof Error
                    ? err
                    : new Error('Failed to send message');
            logger.error('Failed to send message', error);
            setError(error);
        }
    };

    return {
        messages,
        error,
        sendMessage,
    };
};
