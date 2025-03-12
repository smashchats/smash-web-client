import { MessageSquare, Settings as SettingsIcon, Users } from 'lucide-react';
import { useEffect, useState } from 'react';

import './App.css';
import { ChatInput } from './components/chat/ChatInput';
import { ChatList } from './components/chat/ChatList';
import { ChatMessage } from './components/chat/ChatMessage';
import { Settings } from './components/settings/Settings';
import { WelcomeGuide } from './components/WelcomeGuide';
import { initDB } from './lib/db';
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
    } = useSmashIdentity();

    const [conversations, setConversations] = useState<SmashConversation[]>([]);
    const [selectedChat, setSelectedChat] = useState<string>();
    const [messages, setMessages] = useState<SmashMessage[]>([]);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [currentView, setCurrentView] = useState<View>('messages');
    const [error, setError] = useState<Error | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Initialize database on mount
    useEffect(() => {
        initDB().catch((err) => {
            console.error('Failed to initialize database:', err);
            setError(err instanceof Error ? err : new Error('Failed to initialize database'));
        });
    }, []);

    // Add this console.log for debugging
    console.log('App render:', { isInitialized, identity });

    useEffect(() => {
        if (!identity) return;

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
                                  timestamp: new Date(
                                      convo.lastMessage.timestamp,
                                  ),
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

        loadConversations();

        smashService.onMessageReceived((message) => {
            const smashMessage: SmashMessage = {
                ...message,
                timestamp: new Date(message.timestamp),
            };
            setMessages((prev) => [...prev, smashMessage]);
        });

        smashService.onConversationUpdated((conversation) => {
            const smashConversation: SmashConversation = {
                ...conversation,
                lastMessage: conversation.lastMessage
                    ? {
                          ...conversation.lastMessage,
                          timestamp: new Date(
                              conversation.lastMessage.timestamp,
                          ),
                      }
                    : undefined,
            };
            setConversations((prev) =>
                prev.map((conv) =>
                    conv.id === conversation.id ? smashConversation : conv,
                ),
            );
        });
    }, [identity]);

    useEffect(() => {
        if (!selectedChat) return;

        const loadMessages = async () => {
            try {
                setError(null);
                // First ensure DB is initialized
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

    const handleSelectChat = (chatId: string) => {
        setSelectedChat(chatId);
        setIsMobileMenuOpen(false);
    };

    const handleSendMessage = async (content: string) => {
        if (!selectedChat) return;
        try {
            setError(null);
            await smashService.sendMessage(selectedChat, content);
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

    // If no identity, show welcome guide
    if (!identity) {
        return (
            <WelcomeGuide
                onCreateIdentity={async (newIdentity) => {
                    setIsLoading(true);
                    try {
                        await setIdentity(newIdentity);
                        // Set default SME config
                        await updateSMEConfig({
                            url: 'wss://sme.dev.smashchats.com/',
                            smePublicKey: 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEW45b75uMszTovqQSUDhsofhJx78A4Ytm4KV+REh2RRxwwfXVzTOmApNGU+eSoS2kEeDIpgt5ymLj5XPkVuEx+Q==',
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
                    className={`sidebar-button ${currentView === 'messages' ? 'active' : ''}`}
                    onClick={() => setCurrentView('messages')}
                >
                    <MessageSquare />
                </button>
                <button
                    className={`sidebar-button ${currentView === 'explore' ? 'active' : ''}`}
                    onClick={() => setCurrentView('explore')}
                >
                    <Users />
                </button>
                <div className="flex-grow" />
                <button
                    className={`sidebar-button ${currentView === 'settings' ? 'active' : ''}`}
                    onClick={() => setCurrentView('settings')}
                >
                    <SettingsIcon />
                </button>
            </nav>

            {/* Main content */}
            {currentView === 'messages' && (
                <main className="main-area">
                    <div className="chat-container">
                        <div
                            className={`chat-list-container ${
                                isMobileMenuOpen ? 'mobile-open' : ''
                            }`}
                        >
                            <ChatList
                                conversations={conversations}
                                selectedChat={selectedChat}
                                onSelectChat={handleSelectChat}
                            />
                        </div>

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
                <div className="error-toast" role="alert">
                    <p>{error.message}</p>
                    <button
                        onClick={() => setError(null)}
                        className="error-toast-close"
                        aria-label="Close error message"
                    >
                        ×
                    </button>
                </div>
            )}
        </div>
    );
}

export default App;
