import { ArrowLeft } from 'lucide-react';
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { useUIStore } from '../lib/uiStore';
import ScreenHeader, {
    ScreenHeaderLeftSlot,
    ScreenHeaderRightSlot,
} from './ScreenHeader';
import './ScreenWrapper.css';
import { isSlot } from './ScreenWrapper.fn';

type ScreenWrapperProps = {
    children: React.ReactNode;
    title: string;
    shouldAvoidBottomNav?: boolean;
    showBottomNav?: boolean;
    backArrow?: boolean;
    headerStyle?: React.CSSProperties;
    contentStyle?: React.CSSProperties;
};

export default function ScreenWrapper({
    children,
    title,
    shouldAvoidBottomNav = true,
    showBottomNav = true,
    backArrow = false,
    headerStyle,
    contentStyle,
}: Readonly<ScreenWrapperProps>) {
    const navigate = useNavigate();
    const setShowBottomNav = useUIStore((s) => s.setShowBottomNav);

    useEffect(() => {
        setShowBottomNav(showBottomNav);

        return () => {
            setShowBottomNav(true);
        };
    }, [showBottomNav, setShowBottomNav]);

    const slots = React.Children.toArray(children).filter(isSlot);

    const realChildren = React.Children.toArray(children).filter(
        (child) => !isSlot(child),
    );

    // @ts-expect-error - This is a valid type
    let left = slots.find((slot) => slot.type === ScreenHeaderLeftSlot);
    // @ts-expect-error - This is a valid type
    const right = slots.find((slot) => slot.type === ScreenHeaderRightSlot);

    if (backArrow) {
        left = (
            <ScreenHeaderLeftSlot>
                <ArrowLeft
                    onClick={() => navigate(-1)}
                    style={{ cursor: 'pointer' }}
                />
            </ScreenHeaderLeftSlot>
        );
    }

    return (
        <div className="screen-wrapper">
            <ScreenHeader title={title} style={headerStyle}>
                {left}
                {right}
            </ScreenHeader>
            <div
                className={`screen-wrapper-content ${showBottomNav && shouldAvoidBottomNav ? 'avoid-bottom-nav' : ''}`}
                style={contentStyle}
            >
                {realChildren}
            </div>
        </div>
    );
}
