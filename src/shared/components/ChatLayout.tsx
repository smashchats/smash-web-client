import { useUIStore } from '@shared/hooks/useUIStore';
import React from 'react';
import { useLocation } from 'react-router-dom';

import BottomNav from './BottomNav';
import SideNav from './SideNav';

interface ChatLayoutProps {
    children: React.ReactNode;
    chatSidebar?: React.ReactNode;
}

export function ChatLayout({
    children,
    chatSidebar,
}: Readonly<ChatLayoutProps>) {
    const showBottomNav = useUIStore((s) => s.showBottomNav);
    const location = useLocation();

    const isInChat = location.pathname.startsWith('/chat/');
    const isChatListRoute = location.pathname === '/chats';
    const shouldShowChatSidebar = chatSidebar && (isInChat || isChatListRoute);

    return (
        <div className="flex h-screen w-screen overflow-hidden max-w-none">
            <div className="flex w-full h-full max-w-screen-2xl mx-auto">
                {/* Desktop Navigation Sidebar */}
                <div
                    className="hidden md:flex h-full flex-shrink-0 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                    style={{ width: 'var(--ds-sidebar-width)' }}
                >
                    <SideNav />
                </div>

                {/* Desktop Chat Sidebar */}
                {shouldShowChatSidebar && (
                    <div
                        className="hidden md:flex flex-col h-full flex-shrink-0 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                        style={{ width: 'var(--ds-chat-sidebar-width)' }}
                    >
                        {chatSidebar}
                    </div>
                )}

                {/* Main Content Area */}
                <div className="flex-1 h-full overflow-hidden relative flex flex-col min-w-0">
                    {children}
                </div>
            </div>

            {/* Mobile Bottom Navigation */}
            {showBottomNav && (
                <div className="md:hidden fixed bottom-0 left-0 right-0 z-20">
                    <BottomNav />
                </div>
            )}
        </div>
    );
}
