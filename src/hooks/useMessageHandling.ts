import { useEffect, useRef, useState } from 'react';
import { DIDString } from 'smash-node-lib';

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
        if (!selectedChat) return;

        const loadMessages = async () => {
            try {
                logger.info('Loading messages for conversation', {
                    conversationId: selectedChat,
                });
                setError(null);
                const msgs = await smashService.getMessages(selectedChat);
                setMessages(
                    msgs.map((msg) => ({
                        ...msg,
                        timestamp: new Date(msg.timestamp),
                    })),
                );
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

            logger.info('Received new message', { message });
            setMessages((prev) => [...prev, message]);
            conversationUpdateRef.current(message.conversationId, message);
        };

        const handleMessageStatusUpdate = (
            messageId: string,
            status: SmashMessage['status'],
        ) => {
            logger.debug('Message status updated', { messageId, status });
            setMessages((prev) =>
                prev.map((msg) =>
                    msg.id === messageId ? { ...msg, status } : msg,
                ),
            );
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
    }, []); // Remove onConversationUpdate from dependencies

    const sendMessage = async (content: string) => {
        if (!selectedChat) return;

        try {
            logger.info('Sending message', {
                conversationId: selectedChat,
                content,
            });
            setError(null);
            const message = await smashService.sendMessage(
                selectedChat as DIDString,
                content,
            );

            const smashMessage: SmashMessage = {
                ...message,
                timestamp: new Date(message.timestamp),
            };

            logger.debug('Message sent successfully', {
                messageId: smashMessage.id,
            });
            setMessages((prev) => [...prev, smashMessage]);
            conversationUpdateRef.current(selectedChat, smashMessage);
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
