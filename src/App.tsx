import { Menu, MessageSquare, Settings, Users } from 'lucide-react';
import { useEffect, useState } from 'react';

import './App.css';
import { ChatInput } from './components/chat/ChatInput';
import { ChatList } from './components/chat/ChatList';
import { ChatMessage } from './components/chat/ChatMessage';
import { smashService } from './lib/smash-service';
import { SmashConversation, SmashMessage } from './lib/types';

// In a real app, this would come from authentication
const CURRENT_USER = 'You';

function App() {
    const [conversations, setConversations] = useState<SmashConversation[]>([]);
    const [selectedChat, setSelectedChat] = useState<string | undefined>();
    const [messages, setMessages] = useState<SmashMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        const loadConversations = async () => {
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
    }, []);

    useEffect(() => {
        const loadMessages = async () => {
            if (!selectedChat) return;
            try {
                const msgs = await smashService.getMessages(selectedChat);
                setMessages(msgs);
            } catch (error) {
                console.error('Failed to load messages:', error);
            }
        };

        loadMessages();
        // Close mobile menu when chat is selected
        setIsMobileMenuOpen(false);
    }, [selectedChat]);

    const handleSendMessage = async (content: string) => {
        if (!selectedChat) return;
        setIsLoading(true);
        try {
            const message = await smashService.sendMessage(
                selectedChat,
                content,
            );
            setMessages((prev) => [...prev, message]);
        } catch (error) {
            console.error('Failed to send message:', error);
        } finally {
            setIsLoading(false);
        }
    };

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
                <button className="sidebar-button active">
                    <MessageSquare />
                </button>
                <button className="sidebar-button">
                    <Users />
                </button>
                <div className="flex-grow" />
                <button className="sidebar-button">
                    <Settings />
                </button>
            </nav>

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
            <main className="chat-area">
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
