import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { useEffect, useState } from 'react';

import './Button.css';

type ButtonProps = {
    children: ReactNode;
    variant?:
        | 'primary'
        | 'secondary'
        | 'icon'
        | 'floating'
        | 'danger'
        | 'success';
    colorMode?: 'auto' | 'light' | 'dark';
    position?:
        | 'top-left'
        | 'top-right'
        | 'bottom-left'
        | 'bottom-right'
        | 'none';
} & ButtonHTMLAttributes<HTMLButtonElement>;

export default function Button({
    children,
    variant = 'primary',
    colorMode = 'auto',
    position = 'none',
    className,
    ...props
}: ButtonProps) {
    const [isDarkMode, setIsDarkMode] = useState(
        colorMode === 'dark' ||
            (colorMode === 'auto' &&
                window.matchMedia('(prefers-color-scheme: dark)').matches),
    );

    useEffect(() => {
        if (colorMode !== 'auto') return;

        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = (e: MediaQueryListEvent) => {
            setIsDarkMode(e.matches);
        };

        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, [colorMode]);

    const classes = [
        'button',
        `button-${variant}`,
        position !== 'none' ? `button-position-${position}` : '',
        className,
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <button {...props} className={classes} data-dark={isDarkMode}>
            {children}
        </button>
    );
}
