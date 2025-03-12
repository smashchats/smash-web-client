import { Menu, MessageSquare, Settings as SettingsIcon, Users } from 'lucide-react';
import { useEffect, useState } from 'react';

import './App.css';
import { WelcomeGuide } from './components/WelcomeGuide';
import { ChatInput } from './components/chat/ChatInput';
import { ChatList } from './components/chat/ChatList';
import { ChatMessage } from './components/chat/ChatMessage';
import { Settings } from './components/settings/Settings';
import { useSmashIdentity } from './lib/hooks/useSmashIdentity';
import { smashService } from './lib/smash-service';
import { SmashConversation, SmashMessage } from './lib/types';

// In a real app, this would come from authentication
const CURRENT_USER = 'You';

type View = 'messages' | 'contacts' | 'settings';

function App() {
    const { 
        identity, 
        setIdentity, 
        clearIdentity, 
        profile,
        updateProfile,
        error, 
        isInitialized 
    } = useSmashIdentity();
    const [conversations, setConversations] = useState<SmashConversation[]>([]);
    const [selectedChat, setSelectedChat] = useState<string | undefined>();
    const [messages, setMessages] = useState<SmashMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [currentView, setCurrentView] = useState<View>('messages');

    useEffect(() => {
        const loadConversations = async () => {
            if (!identity) return;
            try {
                const convos = await smashService.getConversations();
                setConversations(convos);
            } catch (error) {
                console.error('Failed to load conversations:', error);
            }
        };

        loadConversations();

        smashService.onMessageReceived((message: SmashMessage) => {
            setMessages((prev) => [...prev, message]);
        });

        smashService.onConversationUpdated(
            (conversation: SmashConversation) => {
                setConversations((prev) =>
                    prev.map((conv) =>
                        conv.id === conversation.id ? conversation : conv,
                    ),
                );
            },
        );
    }, [identity]);

    useEffect(() => {
        const loadMessages = async () => {
            if (!selectedChat || !identity) return;

            setIsLoading(true);
            try {
                const msgs = await smashService.getMessages(selectedChat);
                setMessages(msgs);
            } catch (error) {
                console.error('Failed to load messages:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadMessages();
    }, [selectedChat, identity]);

    const handleSendMessage = async (content: string) => {
        if (!selectedChat || !identity) return;

        try {
            const message = await smashService.sendMessage(
                selectedChat,
                content,
            );
            setMessages((prev) => [...prev, message]);
        } catch (error) {
            console.error('Failed to send message:', error);
        }
    };

    const handleLogout = async () => {
        try {
            await clearIdentity();
        } catch (error) {
            console.error('Failed to logout:', error);
        }
    };

    // Show loading state while initializing
    if (!isInitialized) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
            </div>
        );
    }

    // If there's an error initializing Smash, show it
    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen p-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md">
                    <h2 className="text-red-800 font-semibold mb-2">
                        Failed to Initialize
                    </h2>
                    <p className="text-red-600 text-sm">{error.message}</p>
                    <p className="text-red-600 text-sm mt-2">
                        Please refresh the page to try again.
                    </p>
                </div>
            </div>
        );
    }

    // Only show the main app if we have an identity
    if (!identity) {
        return <WelcomeGuide onIdentityCreated={setIdentity} />;
    }

    // Helper function to get conversation name
    const getConversationName = (conversation: SmashConversation) => {
        const otherParticipants = conversation.participants.filter(
            (p) => p !== CURRENT_USER,
        );
        return conversation.type === 'direct'
            ? otherParticipants[0]
            : otherParticipants.join(', ');
    };

    const selectedConversation = selectedChat
        ? conversations.find((c) => c.id === selectedChat)
        : undefined;

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
                    className={`sidebar-button ${currentView === 'contacts' ? 'active' : ''}`}
                    onClick={() => setCurrentView('contacts')}
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
                <>
                    {/* Chat list */}
                    <div className={`chat-list ${isMobileMenuOpen ? 'open' : ''}`}>
                        <div className="chat-list-header">
                            <h2>Messages</h2>
                        </div>
                        <ChatList
                            chats={conversations.map((conv) => ({
                                id: conv.id,
                                name: getConversationName(conv),
                                lastMessage: conv.lastMessage?.content ?? '',
                                timestamp: conv.lastMessage?.timestamp ?? new Date(),
                                unreadCount: conv.unreadCount,
                            }))}
                            selectedChatId={selectedChat}
                            onChatSelect={setSelectedChat}
                        />
                    </div>

                    {/* Main chat area */}
                    <main className="main-area">
                        {/* Mobile header */}
                        <div className="md:hidden flex items-center p-4 border-b border-border">
                            <button
                                className="sidebar-button mr-2"
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            >
                                <Menu />
                            </button>
                            <h2 className="font-semibold">
                                {selectedConversation
                                    ? getConversationName(selectedConversation)
                                    : 'Messages'}
                            </h2>
                        </div>

                        {/* Messages */}
                        <div className="messages-container">
                            {messages.map((message) => (
                                <ChatMessage
                                    key={message.id}
                                    content={message.content}
                                    isOutgoing={message.sender === CURRENT_USER}
                                    timestamp={message.timestamp}
                                    sender={
                                        message.sender === CURRENT_USER
                                            ? 'You'
                                            : message.sender
                                    }
                                    status={message.status}
                                />
                            ))}
                        </div>

                        {/* Chat input */}
                        <ChatInput
                            onSendMessage={handleSendMessage}
                            isLoading={isLoading}
                        />
                    </main>
                </>
            )}

            {currentView === 'settings' && (
                <main className="main-area">
                    <Settings 
                        onLogout={handleLogout}
                        profile={profile}
                        onUpdateProfile={updateProfile}
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
        </div>
    );
}

export default App;
