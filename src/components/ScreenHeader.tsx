import React from 'react';

import './ScreenHeader.css';

interface ScreenHeaderProps {
    title: string;
    children?: React.ReactNode;
    style?: React.CSSProperties;
}

export function ScreenHeader({
    title,
    children,
    style,
}: Readonly<ScreenHeaderProps>) {
    const left = React.Children.toArray(children).find(
        (child: React.ReactNode) =>
            React.isValidElement(child) && child.type === ScreenHeaderLeftSlot,
    );

    const right = React.Children.toArray(children).find(
        (child: React.ReactNode) =>
            React.isValidElement(child) && child.type === ScreenHeaderRightSlot,
    );

    return (
        <div className="screen-header" style={style}>
            <div className="screen-header-left">{left}</div>
            <h2 className="screen-header-title">{title}</h2>
            <div className="screen-header-right">{right}</div>
        </div>
    );
}

// Slot components
export const ScreenHeaderLeftSlot = ({
    children,
}: {
    children: React.ReactNode;
}) => <>{children}</>;

export const ScreenHeaderRightSlot = ({
    children,
}: {
    children: React.ReactNode;
}) => <>{children}</>;

export default ScreenHeader;
