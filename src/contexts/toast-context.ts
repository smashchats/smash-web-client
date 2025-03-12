import { createContext } from 'react';

export interface ToastOptions {
    title?: string;
    description: string;
    action?: {
        label: string;
        onClick: () => void;
        altText: string;
    };
    duration?: number;
}

export interface ToastContextValue {
    toast: (options: ToastOptions) => void;
}

export const ToastContext = createContext<ToastContextValue | undefined>(
    undefined,
);
