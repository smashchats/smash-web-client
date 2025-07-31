import { Camera, Images, MessageCircle } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useTotalUnreadCount } from '../hooks/useTotalUnreadCount';
import { useUIStore } from '../hooks/useUIStore';
import './BottomNav.css';

export default function BottomNav() {
    const show = useUIStore((s) => s.showBottomNav);
    const navigate = useNavigate();
    const location = useLocation();
    const totalUnreadCount = useTotalUnreadCount();

    if (!show) return null;

    const navItems = [
        {
            id: 'chats',
            icon: MessageCircle,
            label: 'Chats',
            path: '/chats',
            isActive:
                location.pathname.startsWith('/chat') ||
                location.pathname === '/chats',
        },
        {
            id: 'camera',
            icon: Camera,
            label: 'Camera',
            path: '/camera',
            isActive: location.pathname === '/camera',
            isCenter: true,
        },
        {
            id: 'gallery',
            icon: Images,
            label: 'Gallery',
            path: '/gallery',
            isActive: location.pathname === '/gallery',
        },
    ];

    return (
        <nav className="bottom-nav">
            <div className="bottom-nav-container">
                {navItems.map((item) => (
                    <NavButton
                        key={item.id}
                        icon={item.icon}
                        label={item.label}
                        isActive={item.isActive}
                        isCenter={item.isCenter}
                        badge={
                            item.id === 'chats' ? totalUnreadCount : undefined
                        }
                        onClick={() => navigate(item.path, { replace: true })}
                    />
                ))}
            </div>
        </nav>
    );
}

interface NavButtonProps {
    icon: React.ComponentType<{ size?: number; fill?: string }>;
    label: string;
    isActive: boolean;
    isCenter?: boolean;
    badge?: number;
    onClick: () => void;
}

function NavButton({
    icon: Icon,
    label,
    isActive,
    isCenter = false,
    badge,
    onClick,
}: Readonly<NavButtonProps>) {
    return (
        <button
            className={`nav-button ${isActive ? 'nav-button--active' : ''} ${isCenter ? 'nav-button--center' : ''}`}
            onClick={onClick}
            aria-label={label}
        >
            <div className="nav-button-icon">
                <Icon
                    size={isCenter ? 24 : 22}
                    fill={isActive && !isCenter ? 'currentColor' : 'none'}
                />
                {badge !== undefined && badge > 0 && (
                    <div className="nav-button-badge">
                        {badge > 99 ? '99+' : badge}
                    </div>
                )}
            </div>
            <span className="nav-button-label">{label}</span>
        </button>
    );
}
