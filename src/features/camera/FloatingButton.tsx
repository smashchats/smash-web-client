import type { ReactNode } from 'react';

import Button from '@shared/components/Button';

type FloatingButtonProps = {
    icon: ReactNode;
    onClick: () => void;
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
};

export default function FloatingButton({
    icon,
    onClick,
    position = 'top-left',
}: Readonly<FloatingButtonProps>) {
    const positionClass = {
        'top-left': 'fixed top-4 left-4',
        'top-right': 'fixed top-4 right-4',
        'bottom-left': 'fixed bottom-4 left-4',
        'bottom-right': 'fixed bottom-4 right-4',
        'none': ''
    }[position] || '';

    return (
        <Button
            variant="primary"
            size="md"
            onClick={onClick}
            className={`${positionClass} z-30 rounded-full w-12 h-12 p-0 flex items-center justify-center`}
        >
            {icon}
        </Button>
    );
}
