import React from 'react';
import { useLocation } from 'react-router-dom';
import { useUIStore } from '@shared/hooks/useUIStore';
import BottomNav from './BottomNav';
import SideNav from './SideNav';
import './ChatLayout.css';

interface ChatLayoutProps {
    children: React.ReactNode;
    chatSidebar?: React.ReactNode;
}

export function ChatLayout({ children, chatSidebar }: Readonly<ChatLayoutProps>) {
    const showBottomNav = useUIStore((s) => s.showBottomNav);
    const location = useLocation();
    
    const isInChat = location.pathname.startsWith('/chat/');
    const isChatListRoute = location.pathname === '/chats';
    const shouldShowChatSidebar = chatSidebar && (isInChat || isChatListRoute);

    return (
        <div className="chat-layout">
            {/* Desktop Navigation Sidebar */}
            <div className="chat-layout__nav-sidebar">
                <SideNav />
            </div>
            
            {/* Desktop Chat Sidebar */}
            {shouldShowChatSidebar && (
                <div className="chat-layout__chat-sidebar">
                    {chatSidebar}
                </div>
            )}
            
            {/* Main Content Area */}
            <div className="chat-layout__main">
                {children}
            </div>
            
            {/* Mobile Bottom Navigation */}
            {showBottomNav && (
                <div className="chat-layout__bottom-nav">
                    <BottomNav />
                </div>
            )}
        </div>
    );
} 
