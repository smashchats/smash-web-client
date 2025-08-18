import { Camera, Images, MessageCircle, Settings } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

import './SideNav.css';

export default function SideNav() {
    const navigate = useNavigate();
    const location = useLocation();

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
        },
        {
            id: 'gallery',
            icon: Images,
            label: 'Gallery',
            path: '/gallery',
            isActive: location.pathname === '/gallery',
        },
        {
            id: 'settings',
            icon: Settings,
            label: 'Settings',
            path: '/profile',
            isActive: location.pathname === '/profile',
        },
    ];

    return (
        <nav className="side-nav" data-testid="side-nav">
            <div className="side-nav-header">
                <div className="side-nav-logo">
                    <MessageCircle className="side-nav-logo-icon" />
                    <h1 className="side-nav-brand">Smashchats</h1>
                </div>
            </div>

            <div className="side-nav-content">
                <ul className="side-nav-list">
                    {navItems.map((item) => (
                        <SideNavItem
                            key={item.id}
                            icon={item.icon}
                            label={item.label}
                            isActive={item.isActive}
                            onClick={() => navigate(item.path)}
                            testId={`side-nav-${item.id}`}
                        />
                    ))}
                </ul>
            </div>
        </nav>
    );
}

interface SideNavItemProps {
    icon: React.ComponentType<{ size?: number }>;
    label: string;
    isActive: boolean;
    onClick: () => void;
    testId?: string;
}

function SideNavItem({
    icon: Icon,
    label,
    isActive,
    onClick,
    testId,
}: Readonly<SideNavItemProps>) {
    return (
        <li className="side-nav-item">
            <button
                className={`side-nav-button ${isActive ? 'side-nav-button--active' : ''}`}
                onClick={onClick}
                aria-label={label}
                data-testid={testId}
            >
                <Icon size={20} />
                <span className="side-nav-button-label">{label}</span>
            </button>
        </li>
    );
}
