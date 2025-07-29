import { Camera, MessageCircle, Images } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useUIStore } from '../hooks/useUIStore';
import './BottomNav.css';

export default function BottomNav() {
    const show = useUIStore((s) => s.showBottomNav);
    const navigate = useNavigate();
    const location = useLocation();

    if (!show) return null;

    const navItems = [
        {
            id: 'chats',
            icon: MessageCircle,
            label: 'Chats',
            path: '/chats',
            isActive: location.pathname.startsWith('/chat') || location.pathname === '/chats'
        },
        {
            id: 'camera',
            icon: Camera,
            label: 'Camera',
            path: '/camera',
            isActive: location.pathname === '/camera',
            isCenter: true
        },
        {
            id: 'gallery',
            icon: Images,
            label: 'Gallery',
            path: '/gallery',
            isActive: location.pathname === '/gallery'
        }
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
    onClick: () => void;
}

function NavButton({ 
    icon: Icon, 
    label, 
    isActive, 
    isCenter = false, 
    onClick 
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
            </div>
            <span className="nav-button-label">{label}</span>
        </button>
    );
}
