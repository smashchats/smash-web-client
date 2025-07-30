import { CURRENT_USER } from '@app/config/sme';
import { messagingService } from '@services/messagingService';
import { useChatStore } from '@shared/hooks/useChatStore';
import { useMessageStore } from '@shared/hooks/useMessageStore';
import { useUIStore } from '@shared/hooks/useUIStore';
import { ArrowLeft } from 'lucide-react';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { DIDString, IMMediaEmbedded } from 'smash-node-lib';

import { ChatInput } from './ChatInput';
import { ChatMessage } from './ChatMessage';
import './ChatScreen.css';
import { UnreadMessageIndicator } from './UnreadMessageIndicator';

export default function ChatScreen() {
    const navigate = useNavigate();
    const { id } = useParams();
    const setShowBottomNav = useUIStore((s) => s.setShowBottomNav);
    const rawMessages = useMessageStore(
        (s) => s.messagesByConversation[id as DIDString],
    );
    const messages = useMemo(() => rawMessages ?? [], [rawMessages]);

    const peerProfile = useChatStore((state) =>
        id ? state.getPeerProfile(id) : undefined,
    );
    const conversation = useChatStore((state) =>
        state.conversations.find((c) => c.id === id),
    );

    const [isProcessingMedia] = useState(false);
    const [hasInitialScroll, setHasInitialScroll] = useState(false);
    const [hasUnreadAbove, setHasUnreadAbove] = useState(false);
    const [hasUnreadBelow, setHasUnreadBelow] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatInputRef = useRef<HTMLTextAreaElement>(null);
    const firstUnreadMessageRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);

    // Hide bottom nav when in chat view
    useEffect(() => {
        setShowBottomNav(false);
        return () => {
            setShowBottomNav(true);
        };
    }, [setShowBottomNav]);

    const handleGoBack = () => {
        navigate('/chats');
    };

    // Check if user is at the bottom of the conversation
    const isUserAtBottom = () => {
        if (!messagesContainerRef.current) return false;

        const container = messagesContainerRef.current;
        const scrollTop = container.scrollTop;
        const scrollHeight = container.scrollHeight;
        const clientHeight = container.clientHeight;

        // Consider user at bottom if they're within 100px of the bottom
        return scrollHeight - scrollTop - clientHeight < 100;
    };

    // Find all unread messages
    const unreadMessages = messages.filter(
        (message) =>
            message.sender !== CURRENT_USER && message.status !== 'read',
    );

    // Find the first unread message
    const firstUnreadMessage = unreadMessages[0];

    // Check for unread messages above and below current viewport
    useEffect(() => {
        if (!messagesContainerRef.current || unreadMessages.length === 0) {
            setHasUnreadAbove(false);
            setHasUnreadBelow(false);
            return;
        }

        const container = messagesContainerRef.current;
        const scrollTop = container.scrollTop;
        const clientHeight = container.clientHeight;
        const scrollBottom = scrollTop + clientHeight;

        let hasUnreadAboveViewport = false;
        let hasUnreadBelowViewport = false;

        unreadMessages.forEach((unreadMessage) => {
            const messageElement = container.querySelector(
                `[data-message-id="${unreadMessage.id}"]`,
            );
            if (messageElement) {
                const rect = messageElement.getBoundingClientRect();
                const containerRect = container.getBoundingClientRect();
                const messageTop =
                    rect.top - containerRect.top + container.scrollTop;
                const messageBottom = messageTop + rect.height;

                if (messageBottom < scrollTop) {
                    hasUnreadAboveViewport = true;
                } else if (messageTop > scrollBottom) {
                    hasUnreadBelowViewport = true;
                }
            }
        });

        setHasUnreadAbove(hasUnreadAboveViewport);
        setHasUnreadBelow(hasUnreadBelowViewport);
    }, [messages, unreadMessages]);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        if (messages.length === 0) return;

        const lastMessage = messages[messages.length - 1];
        const isLastMessageFromCurrentUser =
            lastMessage.sender === CURRENT_USER;

        // Always scroll to bottom for sent messages, only scroll for received messages if user is at bottom
        if (isLastMessageFromCurrentUser || isUserAtBottom()) {
            if (messagesEndRef.current) {
                messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
            }
        }
    }, [messages.length]);

    // Reset initial scroll state when conversation changes
    useEffect(() => {
        setHasInitialScroll(false);
    }, [id]);

    // Auto-scroll to first unread message or bottom on open (only once per conversation)
    useEffect(() => {
        if (!hasInitialScroll) {
            if (firstUnreadMessage && firstUnreadMessageRef.current) {
                // Scroll to first unread message
                firstUnreadMessageRef.current.scrollIntoView({
                    behavior: 'auto',
                    block: 'center',
                });
            } else if (messagesEndRef.current) {
                // Fallback to bottom if no unread messages
                messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
            }
            setHasInitialScroll(true);
        }
    }, [id, firstUnreadMessage, hasInitialScroll]);

    useEffect(() => {
        if (!id) return;
        void messagingService.loadMessages(id as DIDString).then((messages) => {
            useMessageStore.getState().setMessages(id as DIDString, messages);
        });
    }, [id]);

    const sendMessage = async (content: string | IMMediaEmbedded) => {
        // Convert IMMediaEmbedded to File if needed, or handle string content
        let processedContent: string | File;
        if (typeof content === 'string') {
            processedContent = content;
        } else {
            // For now, we'll need to handle media differently
            // The messaging service expects File, but we're receiving IMMediaEmbedded
            // This will be addressed when we implement the camera flow
            console.warn(
                'Media content handling not yet implemented for new UI',
            );
            return;
        }

        const message = await messagingService.sendMessage(
            id as DIDString,
            processedContent,
        );
        useMessageStore.getState().addMessage(id as DIDString, message);
    };

    // Generate display name and avatar
    const displayName = peerProfile?.title || conversation?.title || 'Unknown';
    const initials = displayName
        .split(' ')
        .map((word) => word.charAt(0))
        .join('')
        .substring(0, 2)
        .toUpperCase();

    return (
        <div className="chat-screen h-full md:h-full">
            {/* Chat Header - Mobile and Desktop */}
            <div className="chat-screen-header">
                <button
                    className="chat-screen-header-back md:hidden"
                    onClick={handleGoBack}
                    aria-label="Go back to chats"
                >
                    <ArrowLeft size={20} />
                </button>

                <div className="chat-screen-header-info">
                    <div className="chat-screen-header-avatar">
                        <span className="chat-screen-header-avatar-text">
                            {initials}
                        </span>
                    </div>
                    <div className="chat-screen-header-details">
                        <h1 className="chat-screen-header-name">
                            {displayName}
                        </h1>
                    </div>
                </div>

                <div className="chat-screen-header-actions">
                    {/* Future: Add call, video call, and more options here */}
                </div>
            </div>

            {/* Messages Container */}
            <div
                className="chat-messages flex-1 overflow-y-auto"
                ref={messagesContainerRef}
            >
                <div className="chat-messages-content md:max-w-4xl md:mx-auto">
                    {messages.length === 0 ? (
                        <div className="chat-empty-state">
                            <div className="chat-empty-avatar">
                                <span>{initials}</span>
                            </div>
                            <h3>Start your conversation</h3>
                            <p>
                                Send a message to {displayName} to begin
                                chatting
                            </p>
                        </div>
                    ) : (
                        messages.map((message) => (
                            <Suspense
                                key={message.id}
                                fallback={
                                    <div className="message-loading">
                                        Loading...
                                    </div>
                                }
                            >
                                <ChatMessage
                                    message={message}
                                    isOwnMessage={
                                        message.sender === CURRENT_USER
                                    }
                                    peerProfile={peerProfile}
                                    ref={
                                        message === firstUnreadMessage
                                            ? firstUnreadMessageRef
                                            : undefined
                                    }
                                />
                            </Suspense>
                        ))
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Floating Unread Message Indicators */}
            {hasUnreadAbove && (
                <UnreadMessageIndicator
                    direction="above"
                    onClick={() => {
                        if (firstUnreadMessageRef.current) {
                            firstUnreadMessageRef.current.scrollIntoView({
                                behavior: 'smooth',
                                block: 'center',
                            });
                        }
                    }}
                />
            )}

            {hasUnreadBelow && (
                <UnreadMessageIndicator
                    direction="below"
                    onClick={() => {
                        if (messagesEndRef.current) {
                            messagesEndRef.current.scrollIntoView({
                                behavior: 'smooth',
                            });
                        }
                    }}
                />
            )}

            {/* Chat Input */}
            <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                <div className="md:max-w-4xl md:mx-auto">
                    <ChatInput
                        ref={chatInputRef}
                        onSendMessage={sendMessage}
                        isLoading={isProcessingMedia}
                    />
                </div>
            </div>
        </div>
    );
}
