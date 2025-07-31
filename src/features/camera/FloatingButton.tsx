import Button from '@components/Button';
import type { ReactNode } from 'react';

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
    const positionClass =
        {
            'top-left': 'floating-button--top-left',
            'top-right': 'floating-button--top-right',
            'bottom-left': 'floating-button--bottom-left',
            'bottom-right': 'floating-button--bottom-right',
            none: '',
        }[position] || '';

    return (
        <Button
            variant="primary"
            size="md"
            onClick={onClick}
            className={`floating-button ${positionClass}`}
        >
            {icon}
        </Button>
    );
}
