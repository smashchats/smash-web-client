import React from 'react';
import { useLocation } from 'react-router-dom';
import ChatListScreen from './ChatListScreen';
import ChatScreen from './ChatScreen';
import './ResponsiveChatLayout.css';

interface ResponsiveChatLayoutProps {
    children?: React.ReactNode;
}

export function ResponsiveChatLayout({ children }: Readonly<ResponsiveChatLayoutProps>) {
    const location = useLocation();
    const isInChat = location.pathname.startsWith('/chat/');

    return (
        <div className="responsive-chat-layout">
            {/* Chat List - always visible on desktop, hidden when in chat on mobile */}
            <div className={`responsive-chat-layout__sidebar ${isInChat ? 'responsive-chat-layout__sidebar--hidden-mobile' : ''}`}>
                <ChatListScreen />
            </div>
            
            {/* Chat Area - only visible when in chat */}
            {isInChat && (
                <div className="responsive-chat-layout__main">
                    <ChatScreen />
                </div>
            )}
            
            {/* Fallback content when not in chat and on desktop */}
            {!isInChat && (
                <div className="responsive-chat-layout__empty">
                    <div className="responsive-chat-layout__empty-content">
                        <h3>Select a chat to start messaging</h3>
                        <p>Choose a conversation from the list to begin chatting.</p>
                    </div>
                </div>
            )}
            
            {children}
        </div>
    );
}

export default ResponsiveChatLayout; 
