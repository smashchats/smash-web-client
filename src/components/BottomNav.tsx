import { Camera, Images, MessageCircle } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useUIStore } from '../lib/uiStore';

export default function BottomNav() {
    const show = useUIStore((s) => s.showBottomNav);
    const navigate = useNavigate();
    const location = useLocation();
    const isDarkMode = window.matchMedia(
        '(prefers-color-scheme: dark)',
    ).matches;

    if (!show) return null;

    return (
        <nav
            style={{
                position: 'fixed',
                bottom: -1,
                width: '100vw',
                height: 'var(--bottom-nav-height)',
                backdropFilter: 'blur(8px)',
                backgroundColor: isDarkMode
                    ? 'rgba(0,0,0,0.4)'
                    : 'rgba(230,230,230,0.4)',
                display: 'flex',
                justifyContent: 'space-around',
                padding: '4px 0',
                zIndex: 10,
            }}
        >
            <IconButton
                onClick={() => navigate('/chats')}
                active={location.pathname.startsWith('/chat')}
                isDarkMode={isDarkMode}
            >
                <MessageCircle />
            </IconButton>

            <IconButton
                onClick={() => navigate('/camera')}
                active={location.pathname === '/camera'}
                isDarkMode={isDarkMode}
            >
                <Camera />
            </IconButton>
            <IconButton
                onClick={() => navigate('/gallery')}
                active={location.pathname === '/gallery'}
                isDarkMode={isDarkMode}
            >
                <Images />
            </IconButton>
        </nav>
    );
}

function IconButton({
    children,
    onClick,
    active,
    isDarkMode,
}: Readonly<{
    children: React.ReactNode;
    onClick: () => void;
    active: boolean;
    isDarkMode: boolean;
}>) {
    const activeColor = isDarkMode ? '#fff' : '#000';
    const inactiveColor = isDarkMode ? '#aaa' : '#666';
    const color = active ? activeColor : inactiveColor;

    return (
        <button
            onClick={onClick}
            style={{
                background: 'none',
                border: 'none',
                color,
                fontSize: 8,
            }}
        >
            {children}
        </button>
    );
}
