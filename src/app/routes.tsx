import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';


import { ChatLayout } from '@shared/components/ChatLayout';
import AppGuard from './providers/AppGuard';
import LoadingScreen from '@shared/components/LoadingScreen';

// Lazy load route components for better performance
const CameraScreen = lazy(() => import('../features/camera/CameraScreen'));
const ChatListScreen = lazy(() => import('../features/chat/ChatListScreen'));
const ChatScreen = lazy(() => import('../features/chat/ChatScreen'));
const ChatListSidebar = lazy(() => import('../features/chat/ChatListSidebar').then(module => ({ default: module.ChatListSidebar })));
const GalleryScreen = lazy(() => import('../features/gallery/GalleryScreen'));
const HomeScreen = lazy(() => import('../features/home/HomeScreen'));
const WelcomeGuide = lazy(() => import('../features/onboarding/WelcomeGuide'));
const ProfileScreen = lazy(() => import('../features/profile/ProfileScreen'));

// Loading fallback component
const RouteLoading = () => (
    <LoadingScreen />
);

export default function AppRoutes() {
    const chatSidebar = (
        <Suspense fallback={<RouteLoading />}>
            <ChatListSidebar />
        </Suspense>
    );

    return (
        <>
            {/* Always render the main app layout */}
            <AppGuard>
                <ChatLayout chatSidebar={chatSidebar}>
                    <Suspense fallback={<RouteLoading />}>
                        <Routes>
                            <Route path="/" element={<HomeScreen />} />
                            <Route path="/camera" element={<CameraScreen />} />
                            <Route path="/chat/:id" element={<ChatScreen />} />
                            <Route path="/chats" element={<ChatListScreen />} />
                            <Route path="/gallery" element={<GalleryScreen />} />
                            <Route path="/profile" element={<ProfileScreen />} />
                        </Routes>
                    </Suspense>
                </ChatLayout>
            </AppGuard>
            
            {/* Welcome screen as overlay */}
            <Routes>
                <Route 
                    path="/welcome" 
                    element={
                        <Suspense fallback={<RouteLoading />}>
                            <WelcomeGuide />
                        </Suspense>
                    } 
                />
            </Routes>
        </>
    );
}
