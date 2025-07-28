import React from 'react';
import { useUIStore } from '../hooks/useUIStore';
import BottomNav from './BottomNav';
import SideNav from './SideNav';
import './ResponsiveLayout.css';

interface ResponsiveLayoutProps {
    children: React.ReactNode;
}

export function ResponsiveLayout({ children }: Readonly<ResponsiveLayoutProps>) {
    const showBottomNav = useUIStore((s) => s.showBottomNav);

    return (
        <div className="responsive-layout">
            {/* Desktop Sidebar Navigation */}
            <div className="responsive-layout__sidebar">
                <SideNav />
            </div>
            
            {/* Main Content Area */}
            <div className="responsive-layout__main">
                {children}
            </div>
            
            {/* Mobile Bottom Navigation */}
            {showBottomNav && (
                <div className="responsive-layout__bottom-nav">
                    <BottomNav />
                </div>
            )}
        </div>
    );
}

export default ResponsiveLayout; 
