import type { ReactNode } from 'react';

import Button from '../../components/Button';

type FloatingButtonProps = {
    icon: ReactNode;
    onClick: () => void;
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    colorMode?: 'auto' | 'light' | 'dark';
};

export default function FloatingButton({
    icon,
    onClick,
    position = 'top-left',
    colorMode = 'auto',
}: Readonly<FloatingButtonProps>) {
    return (
        <Button
            variant="floating"
            position={position}
            colorMode={colorMode}
            onClick={onClick}
            style={{ zIndex: 30 }}
        >
            {icon}
        </Button>
    );
}
