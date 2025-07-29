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
        <div className="flex h-screen w-screen overflow-hidden">
            {/* Desktop Navigation Sidebar */}
            <div className="hidden md:flex w-16 lg:w-20 h-full flex-shrink-0 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 z-10">
                <SideNav />
            </div>

            {/* Desktop Chat Sidebar */}
            {shouldShowChatSidebar && (
                <div className="hidden md:flex flex-col w-80 lg:w-96 h-full flex-shrink-0 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 z-10">
                    {chatSidebar}
                </div>
            )}

            {/* Main Content Area */}
            <div className="flex-1 h-full overflow-hidden relative flex flex-col md:max-w-none">
                {children}
            </div>

            {/* Mobile Bottom Navigation */}
            {showBottomNav && (
                <div className="md:hidden fixed bottom-0 left-0 right-0 z-20">
                    <BottomNav />
                </div>
            )}

            {/* Desktop Empty State - Show when on desktop chat list without specific chat selected */}
            {isChatListRoute && shouldShowChatSidebar && (
                <div className="hidden md:flex flex-1 items-center justify-center bg-gray-50 dark:bg-gray-800">
                    <div className="text-center max-w-md px-6">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                            <svg
                                className="w-8 h-8 text-gray-400 dark:text-gray-500"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                                />
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                            Select a conversation
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400">
                            Choose from your existing conversations or start a
                            new one to begin messaging.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
