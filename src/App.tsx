import { MessageSquare, Settings as SettingsIcon, Users } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { DIDDocument, SmashMessaging } from 'smash-node-lib';

import './App.css';
import { WelcomeGuide } from './components/WelcomeGuide';
import { ChatInput } from './components/chat/ChatInput';
import { ChatList } from './components/chat/ChatList';
import { ChatMessage } from './components/chat/ChatMessage';
import { Settings } from './components/settings/Settings';
import { StoredConversation, db, initDB } from './lib/db';
import { useSmashIdentity } from './lib/hooks/useSmashIdentity';
import { smashService } from './lib/smash-service';
import { SmashConversation, SmashMessage } from './lib/types';

// In a real app, this would come from authentication
const CURRENT_USER = 'You';

type View = 'messages' | 'explore' | 'settings';

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

    const [conversations, setConversations] = useState<SmashConversation[]>([]);
    const [selectedChat, setSelectedChat] = useState<string>();
    const [messages, setMessages] = useState<SmashMessage[]>([]);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [currentView, setCurrentView] = useState<View>('messages');
    const [error, setError] = useState<Error | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Add ref for messages container
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Add scroll to bottom function
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Scroll to bottom when messages change
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Scroll to bottom when selected chat changes
    useEffect(() => {
        if (selectedChat) {
            scrollToBottom();
        }
    }, [selectedChat]);

    // Initialize database on mount
    useEffect(() => {
        initDB().catch((err) => {
            console.error('Failed to initialize database:', err);
            setError(
                err instanceof Error
                    ? err
                    : new Error('Failed to initialize database'),
            );
        });
    }, []);

    const loadConversations = async () => {
        try {
            setError(null);
            // First ensure DB is initialized
            await initDB();
            const convos = await smashService.getConversations();
            setConversations(
                convos.map((convo) => ({
                    ...convo,
                    lastMessage: convo.lastMessage
                        ? {
                              ...convo.lastMessage,
                              timestamp: new Date(convo.lastMessage.timestamp),
                          }
                        : undefined,
                })),
            );
        } catch (err) {
            console.error('Failed to load conversations:', err);
            setError(
                err instanceof Error
                    ? err
                    : new Error('Failed to load conversations'),
            );
        }
    };

    useEffect(() => {
        if (!identity) return;

        loadConversations();

        // Set up message handling
        smashService.onMessageReceived((message) => {
            const smashMessage: SmashMessage = {
                ...message,
                timestamp: new Date(message.timestamp),
            };
            setMessages((prev) => [...prev, smashMessage]);

            // Update conversation's last message
            setConversations((prev) =>
                prev.map((conv) =>
                    conv.id === message.conversationId
                        ? {
                              ...conv,
                              lastMessage: smashMessage,
                              unreadCount: conv.unreadCount + 1,
                          }
                        : conv,
                ),
            );
        });

        // Handle conversation updates (new or updated conversations)
        smashService.onConversationUpdated((conversation) => {
            setConversations((prev) => {
                // Convert StoredConversation to SmashConversation
                const smashConversation: SmashConversation = {
                    ...conversation,
                    lastMessage: conversation.lastMessage
                        ? {
                              ...conversation.lastMessage,
                              timestamp: new Date(conversation.lastMessage.timestamp),
                          }
                        : undefined,
                };

                const existing = prev.find((c) => c.id === conversation.id);
                if (existing) {
                    // Update existing conversation
                    return prev.map((c) =>
                        c.id === conversation.id ? smashConversation : c
                    );
                } else {
                    // Add new conversation
                    return [...prev, smashConversation];
                }
            });
        });

        // Handle message status updates
        smashService.onMessageStatusUpdated((messageId, status) => {
            setMessages((prev) =>
                prev.map((msg) =>
                    msg.id === messageId ? { ...msg, status } : msg,
                ),
            );
        });
    }, [identity]);

    useEffect(() => {
        if (!selectedChat) return;

        const loadMessages = async () => {
            try {
                setError(null);
                await initDB();
                const msgs = await smashService.getMessages(selectedChat);
                setMessages(
                    msgs.map((msg) => ({
                        ...msg,
                        timestamp: new Date(msg.timestamp),
                    })),
                );
            } catch (err) {
                console.error('Failed to load messages:', err);
                setError(
                    err instanceof Error
                        ? err
                        : new Error('Failed to load messages'),
                );
            }
        };

        loadMessages();
    }, [selectedChat]);

    const handleCreateConversation = async (didDoc: DIDDocument) => {
        console.log('🔄 App: Starting conversation creation process...', {
            didId: didDoc.id,
            currentUser: CURRENT_USER,
        });

        try {
            setError(null);
            console.log('🗑️ Cleared previous errors');

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
            console.log('📝 Created conversation object:', conversation);

            console.log('💾 Adding conversation to database...');
            await db.addConversation(conversation);
            console.log('✅ Conversation added to database successfully');

            // Update the UI
            const uiConversation: SmashConversation = {
                ...conversation,
                type: 'direct',
                lastMessage: conversation.lastMessage
                    ? {
                          ...conversation.lastMessage,
                          timestamp: new Date(
                              conversation.lastMessage.timestamp,
                          ),
                      }
                    : undefined,
            };
            console.log('🎨 Created UI conversation object:', uiConversation);

            console.log('🔄 Updating conversations state...');
            setConversations((prev) => [...prev, uiConversation]);
            console.log('🎯 Setting selected chat to:', conversation.id);
            setSelectedChat(conversation.id);

            // Store the DID document for future message sending
            console.log('📨 Resolving DID document in SmashMessaging...');
            SmashMessaging.resolve(didDoc);
            console.log('✨ Conversation creation completed successfully');
        } catch (err) {
            console.error('❌ Error in handleCreateConversation:', err);
            console.error(
                'Stack trace:',
                err instanceof Error ? err.stack : 'No stack trace available',
            );
            setError(
                err instanceof Error
                    ? err
                    : new Error('Failed to create conversation'),
            );
        }
    };

    const handleSelectChat = (chatId: string) => {
        setSelectedChat(chatId);
        setIsMobileMenuOpen(false);
    };

    const handleSendMessage = async (content: string) => {
        if (!selectedChat) return;

        try {
            setError(null);
            // Find the conversation to get the recipient's DID
            const conversation = conversations.find(
                (c) => c.id === selectedChat,
            );
            if (!conversation) return;

            // Get the recipient's DID (the participant that isn't the current user)
            const recipientDID = conversation.participants.find(
                (p) => p !== CURRENT_USER,
            );
            if (!recipientDID) return;

            const message = await smashService.sendMessage(
                recipientDID as
                    | `did:key:${string}`
                    | `did:web:${string}`
                    | `did:plc:${string}`
                    | `did:doc:${string}`,
                content,
            );

            const smashMessage: SmashMessage = {
                ...message,
                timestamp: new Date(message.timestamp),
            };

            // Update messages
            setMessages((prev) => [...prev, smashMessage]);

            // Update conversation
            setConversations((prev) =>
                prev.map((conv) =>
                    conv.id === selectedChat
                        ? {
                              ...conv,
                              lastMessage: smashMessage,
                          }
                        : conv,
                ),
            );
        } catch (err) {
            console.error('Failed to send message:', err);
            setError(
                err instanceof Error
                    ? err
                    : new Error('Failed to send message'),
            );
        }
    };

    const handleLogout = async () => {
        await clearIdentity();
    };

    // If not initialized, show loading state
    if (!isInitialized) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p>Loading...</p>
            </div>
        );
    }

    // If no identity AND we're initialized, show welcome guide
    if (!identity && isInitialized) {
        return (
            <WelcomeGuide
                onCreateIdentity={async (newIdentity) => {
                    setIsLoading(true);
                    try {
                        await setIdentity(newIdentity, {
                            url: 'wss://sme.dev.smashchats.com/',
                            smePublicKey:
                                'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEW45b75uMszTovqQSUDhsofhJx78A4Ytm4KV+REh2RRxwwfXVzTOmApNGU+eSoS2kEeDIpgt5ymLj5XPkVuEx+Q==',
                        });
                    } finally {
                        setIsLoading(false);
                    }
                }}
                isLoading={isLoading}
                error={error}
            />
        );
    }

    return (
        <div className="app-container">
            {/* Sidebar */}
            <nav className="sidebar">
                <button
                    className={`sidebar-button ${
                        currentView === 'messages' ? 'active' : ''
                    }`}
                    onClick={() => setCurrentView('messages')}
                >
                    <MessageSquare size={24} />
                </button>
                <button
                    className={`sidebar-button ${
                        currentView === 'explore' ? 'active' : ''
                    }`}
                    onClick={() => setCurrentView('explore')}
                >
                    <Users size={24} />
                </button>
                <button
                    className={`sidebar-button ${
                        currentView === 'settings' ? 'active' : ''
                    }`}
                    onClick={() => setCurrentView('settings')}
                >
                    <SettingsIcon size={24} />
                </button>
            </nav>

            {/* Main content */}
            {currentView === 'messages' && (
                <main className="chat-container">
                    <div
                        className={`chat-list-container ${
                            isMobileMenuOpen ? 'mobile-open' : ''
                        }`}
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
                                <ChatInput onSendMessage={handleSendMessage} />
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
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Error toast */}
            {error && (
                <div className="error-toast">
                    <p>{error.message}</p>
                    <button
                        onClick={() => setError(null)}
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
