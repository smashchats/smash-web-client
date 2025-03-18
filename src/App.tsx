import { MessageSquare, Settings as SettingsIcon, Users } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { DIDDocument, SmashMessaging } from 'smash-node-lib';

import './App.css';
import { WelcomeGuide } from './components/WelcomeGuide';
import { ChatInput } from './components/chat/ChatInput';
import { ChatList } from './components/chat/ChatList';
import { ChatMessage } from './components/chat/ChatMessage';
import { Settings } from './components/settings/Settings';
import { CURRENT_USER, DEFAULT_SME_CONFIG, View } from './config/constants';
import { useConversationHandling } from './hooks/useConversationHandling';
import { useMessageHandling } from './hooks/useMessageHandling';
import { StoredConversation, db, initDB } from './lib/db';
import { useSmashIdentity } from './lib/hooks/useSmashIdentity';
import { logger } from './lib/logger';

function App() {
    const {
        identity,
        clearIdentity,
        profile,
        updateProfile,
        smeConfig,
        updateSMEConfig,
        isInitialized,
        setIdentity,
        smashUser,
    } = useSmashIdentity();

    const [selectedChat, setSelectedChat] = useState<string>();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [currentView, setCurrentView] = useState<View>('messages');
    const [isLoading, setIsLoading] = useState(false);

    // Add ref for messages container
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const markReadTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

    const {
        conversations,
        error: conversationError,
        updateConversationWithMessage,
        markConversationAsRead,
        refreshConversations,
    } = useConversationHandling();

    const {
        messages,
        error: messageError,
        sendMessage,
    } = useMessageHandling({
        selectedChat,
        onConversationUpdate: updateConversationWithMessage,
    });

    // Add scroll to bottom function
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Scroll to bottom when messages change
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Handle marking messages as read when conversation is focused
    const handleConversationFocus = useCallback(
        async (conversationId: string) => {
            logger.debug('Handling conversation focus', { conversationId });
            // Clear any existing timeout
            if (markReadTimeoutRef.current) {
                clearTimeout(markReadTimeoutRef.current);
            }

            // Set a new timeout to mark as read after 1 second
            markReadTimeoutRef.current = setTimeout(async () => {
                try {
                    await markConversationAsRead(conversationId);
                    logger.debug('Conversation marked as read', {
                        conversationId,
                    });
                } catch (err) {
                    logger.error('Failed to mark conversation as read', err);
                }
            }, 1000);
        },
        [markConversationAsRead],
    );

    // Clean up timeout on unmount
    useEffect(() => {
        return () => {
            if (markReadTimeoutRef.current) {
                clearTimeout(markReadTimeoutRef.current);
            }
        };
    }, []);

    // Handle conversation focus when selected chat changes or tab becomes visible
    useEffect(() => {
        if (!selectedChat) return;

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                handleConversationFocus(selectedChat);
            }
        };

        // Mark as read when initially selecting and visible
        if (document.visibilityState === 'visible') {
            handleConversationFocus(selectedChat);
        }

        // Add visibility change listener
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener(
                'visibilitychange',
                handleVisibilityChange,
            );
        };
    }, [handleConversationFocus, selectedChat]);

    // Initialize database on mount
    useEffect(() => {
        logger.debug('Initializing database');
        initDB().catch((err) => {
            logger.error('Failed to initialize database', err);
        });
    }, []);

    const handleCreateConversation = async (didDoc: DIDDocument) => {
        logger.info('Starting conversation creation process', {
            didId: didDoc.id,
        });

        try {
            // Create a new conversation in the database
            const conversation: StoredConversation = {
                id: didDoc.id,
                title: `Chat with ${didDoc.id.slice(0, 8)}...`,
                participants: [CURRENT_USER, didDoc.id],
                type: 'direct',
                unreadCount: 0,
                updatedAt: new Date().toISOString(),
                lastMessage: undefined,
            };

            logger.debug('Adding conversation to database', {
                conversationId: conversation.id,
            });
            await db.addConversation(conversation);

            setSelectedChat(conversation.id);

            // Store the DID document for future message sending
            logger.debug('Resolving DID document in SmashMessaging', {
                didId: didDoc.id,
            });
            SmashMessaging.resolve(didDoc);
            logger.info('Conversation creation completed successfully', {
                conversationId: conversation.id,
            });
        } catch (err) {
            logger.error('Failed to create conversation', err);
            throw err;
        }
    };

    const handleSelectChat = async (chatId: string) => {
        logger.debug('Selecting chat', { chatId });
        setSelectedChat(chatId);
        setIsMobileMenuOpen(false);
    };

    const handleLogout = async () => {
        logger.info('Logging out user');
        await clearIdentity();
    };

    // If not initialized, show loading state
    if (!isInitialized) {
        logger.debug('Application not initialized, showing loading state');
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p>Loading...</p>
            </div>
        );
    }

    // If no identity AND we're initialized, show welcome guide
    if (!identity && isInitialized) {
        logger.debug('No identity found, showing welcome guide');
        return (
            <WelcomeGuide
                onCreateIdentity={async (newIdentity) => {
                    setIsLoading(true);
                    try {
                        await setIdentity(newIdentity, DEFAULT_SME_CONFIG);
                        logger.info(
                            'New identity created and set successfully',
                        );
                    } finally {
                        setIsLoading(false);
                    }
                }}
                isLoading={isLoading}
                error={conversationError || messageError}
            />
        );
    }

    logger.debug('Rendering main application view', {
        currentView,
        selectedChat,
        conversationCount: conversations.length,
    });

    return (
        <div className="app-container">
            {/* Sidebar */}
            <nav className="sidebar">
                <button
                    className={`sidebar-button ${currentView === 'messages' ? 'active' : ''}`}
                    onClick={() => {
                        logger.debug('Switching to messages view');
                        setCurrentView('messages');
                    }}
                >
                    <MessageSquare size={24} />
                </button>
                <button
                    className={`sidebar-button ${currentView === 'explore' ? 'active' : ''}`}
                    onClick={() => {
                        logger.debug('Switching to explore view');
                        setCurrentView('explore');
                    }}
                >
                    <Users size={24} />
                </button>
                <button
                    className={`sidebar-button ${currentView === 'settings' ? 'active' : ''}`}
                    onClick={() => {
                        logger.debug('Switching to settings view');
                        setCurrentView('settings');
                    }}
                >
                    <SettingsIcon size={24} />
                </button>
            </nav>

            {/* Main content */}
            {currentView === 'messages' && (
                <main className="chat-container">
                    <div
                        className={`chat-list-container ${isMobileMenuOpen ? 'mobile-open' : ''}`}
                    >
                        <ChatList
                            conversations={conversations}
                            selectedChat={selectedChat}
                            onSelectChat={handleSelectChat}
                            onCreateConversation={handleCreateConversation}
                        />
                    </div>

                    <div className="flex-1 flex flex-col">
                        {selectedChat ? (
                            <div className="chat-messages-container">
                                <div className="messages-container">
                                    {messages.map((message) => (
                                        <ChatMessage
                                            key={message.id}
                                            message={message}
                                            isOwnMessage={
                                                message.sender === CURRENT_USER
                                            }
                                        />
                                    ))}
                                    <div ref={messagesEndRef} />
                                </div>
                                <ChatInput onSendMessage={sendMessage} />
                            </div>
                        ) : (
                            <div className="no-chat-selected">
                                <p>Select a chat to start messaging</p>
                            </div>
                        )}
                    </div>
                </main>
            )}

            {currentView === 'explore' && (
                <main className="main-area">
                    <div className="explore-container">
                        <h2>Explore your neighborhood</h2>
                        <p>Coming soon...</p>
                    </div>
                </main>
            )}

            {currentView === 'settings' && (
                <main className="main-area">
                    <Settings
                        onLogout={handleLogout}
                        profile={profile}
                        onUpdateProfile={updateProfile}
                        smeConfig={smeConfig}
                        onUpdateSME={updateSMEConfig}
                        identity={identity}
                        smashUser={smashUser}
                    />
                </main>
            )}

            {/* Mobile overlay */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-background/80 backdrop-blur-sm z-20 md:hidden"
                    onClick={() => {
                        logger.debug('Closing mobile menu');
                        setIsMobileMenuOpen(false);
                    }}
                />
            )}

            {/* Error toast */}
            {(conversationError || messageError) && (
                <div className="error-toast">
                    <p>{(conversationError || messageError)?.message}</p>
                    <button
                        onClick={() => {
                            logger.debug(
                                'Refreshing conversations to clear errors',
                            );
                            refreshConversations();
                        }}
                        className="error-toast-close"
                    >
                        ×
                    </button>
                </div>
            )}
        </div>
    );
}

export default App;
