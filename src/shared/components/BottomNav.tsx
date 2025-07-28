import { Camera, MessageCircle, User } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useUIStore } from '../hooks/useUIStore';
import './BottomNav.css'; // TODO: migrate to Tailwind utilities

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
            className="bottom-nav"
            style={{
                backgroundColor: isDarkMode
                    ? 'rgba(0,0,0,0.6)'
                    : 'rgba(230,230,230,0.6)',
            }}
        >
            <IconButton
                onClick={() => navigate('/chats', { replace: true })}
                active={location.pathname.startsWith('/chat') || location.pathname.startsWith('/chats')}
                isDarkMode={isDarkMode}
            >
                <MessageCircle
                    fill={
                        location.pathname.startsWith('/chat')
                            ? 'var(--ds-color-primary-600)'
                            : 'transparent'
                    }
                />
            </IconButton>

            <IconButton
                onClick={() => navigate('/camera', { replace: true })}
                active={location.pathname === '/camera'}
                isDarkMode={isDarkMode}
            >
                <Camera />
            </IconButton>
            <IconButton
                onClick={() => navigate('/profile', { replace: true })}
                active={location.pathname.startsWith('/profile')}
                isDarkMode={isDarkMode}
            >
                <User />
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
    const activeColor = 'var(--ds-color-primary-600)';
    const inactiveColor = isDarkMode ? '#aaa' : '#666';
    const color = active ? activeColor : inactiveColor;

    return (
        <button
            className="bottom-nav-button"
            onClick={onClick}
            style={{
                color,
            }}
        >
            {children}
        </button>
    );
}
