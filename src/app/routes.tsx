import { Route, Routes } from 'react-router-dom';

import CameraScreen from '../features/camera/CameraScreen';
import ChatListScreen from '../features/chat/ChatListScreen';
import ChatScreen from '../features/chat/ChatScreen';
import GalleryScreen from '../features/gallery/GalleryScreen';
import HomeScreen from '../features/home/HomeScreen';
import WelcomeGuide from '../features/onboarding/WelcomeGuide';
import ProfileScreen from '../features/profile/ProfileScreen';
import AppGuard from './AppGuard';

export default function AppRoutes() {
    return (
        <Routes>
            <Route path="/welcome" element={<WelcomeGuide />} />
            <Route
                path="*"
                element={
                    <AppGuard>
                        <Routes>
                            <Route path="/" element={<HomeScreen />} />
                            <Route path="/camera" element={<CameraScreen />} />
                            <Route path="/chats" element={<ChatListScreen />} />
                            <Route path="/chat/:id" element={<ChatScreen />} />
                            <Route
                                path="/gallery"
                                element={<GalleryScreen />}
                            />
                            <Route
                                path="/profile"
                                element={<ProfileScreen />}
                            />
                        </Routes>
                    </AppGuard>
                }
            />
        </Routes>
    );
}
