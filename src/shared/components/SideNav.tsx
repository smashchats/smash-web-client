import { Camera, Images, MessageCircle, User } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import './SideNav.css';

export default function SideNav() {
    const navigate = useNavigate();
    const location = useLocation();

    const navigationItems = [
        {
            path: '/chats',
            icon: MessageCircle,
            label: 'Chats',
            active: location.pathname.startsWith('/chat'),
        },
        {
            path: '/camera',
            icon: Camera,
            label: 'Camera',
            active: location.pathname === '/camera',
        },
        {
            path: '/gallery',
            icon: Images,
            label: 'Gallery',
            active: location.pathname === '/gallery',
        },
        {
            path: '/profile',
            icon: User,
            label: 'Profile',
            active: location.pathname === '/profile',
        },
    ];

    return (
        <nav className="side-nav">
            <div className="side-nav__header">
                <h2 className="side-nav__title">SmashChats</h2>
            </div>
            
            <div className="side-nav__menu">
                {navigationItems.map((item) => (
                    <button
                        key={item.path}
                        className={`side-nav__item ${item.active ? 'side-nav__item--active' : ''}`}
                        onClick={() => navigate(item.path, { replace: true })}
                    >
                        <item.icon 
                            className="side-nav__icon"
                            fill={item.active ? 'currentColor' : 'transparent'}
                        />
                        <span className="side-nav__label">{item.label}</span>
                    </button>
                ))}
            </div>
        </nav>
    );
} 
