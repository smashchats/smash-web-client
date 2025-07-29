import { CURRENT_USER } from '@app/config/sme';
import { messagingService } from '@services/messagingService';
import { useChatStore } from '@shared/hooks/useChatStore';
import { useMessageStore } from '@shared/hooks/useMessageStore';
import { useUIStore } from '@shared/hooks/useUIStore';
import { ArrowLeft } from 'lucide-react';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { DIDString, IMMediaEmbedded } from 'smash-node-lib';

import { ChatInput } from './ChatInput';
import { ChatMessage } from './ChatMessage';
import './ChatScreen.css';

export default function ChatScreen() {
    const navigate = useNavigate();
    const { id } = useParams();
    const setShowBottomNav = useUIStore((s) => s.setShowBottomNav);
    const rawMessages = useMessageStore(
        (s) => s.messagesByConversation[id as DIDString],
    );
    const messages = rawMessages ?? [];

    const peerProfile = useChatStore((state) =>
        id ? state.getPeerProfile(id) : undefined,
    );
    const conversation = useChatStore((state) =>
        state.conversations.find((c) => c.id === id),
    );

    const [isProcessingMedia] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatInputRef = useRef<HTMLTextAreaElement>(null);

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

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages.length]);

    // Auto-scroll to bottom on open (no animation)
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
        }
    }, [id]);

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
            {/* Chat Header */}
            <div className="chat-header md:hidden">
                <button
                    className="chat-header-back"
                    onClick={handleGoBack}
                    aria-label="Go back to chats"
                >
                    <ArrowLeft size={20} />
                </button>

                <div className="chat-header-info">
                    <div className="chat-header-avatar">
                        <span className="chat-header-avatar-text">
                            {initials}
                        </span>
                    </div>
                    <div className="chat-header-details">
                        <h1 className="chat-header-name">{displayName}</h1>
                    </div>
                </div>

                <div className="chat-header-actions">
                    {/* Future: Add call, video call, and more options here */}
                </div>
            </div>

            {/* Desktop Header - simplified for desktop layout */}
            <div className="hidden md:flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                        <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">
                            {initials}
                        </span>
                    </div>
                    <div>
                        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {displayName}
                        </h1>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {/* Future: Add call, video call, and more options here */}
                </div>
            </div>

            {/* Messages Container */}
            <div className="chat-messages flex-1 overflow-y-auto">
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
                                />
                            </Suspense>
                        ))
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </div>

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
