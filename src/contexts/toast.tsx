import * as React from 'react';

import {
    ToastProvider as RadixToastProvider,
    Toast,
    ToastViewport,
} from '../components/ui/toast';
import { ToastContext, ToastOptions } from './toast-context';

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = React.useState<
        (ToastOptions & { id: string })[]
    >([]);

    const toast = React.useCallback((options: ToastOptions) => {
        const id = Math.random().toString(36).slice(2);
        setToasts((prev) => [...prev, { ...options, id }]);
    }, []);

    const onOpenChange = React.useCallback((open: boolean, id: string) => {
        if (!open) {
            setToasts((prev) => prev.filter((toast) => toast.id !== id));
        }
    }, []);

    return (
        <ToastContext.Provider value={{ toast }}>
            {children}
            <RadixToastProvider>
                {toasts.map((toast) => (
                    <Toast
                        key={toast.id}
                        open={true}
                        onOpenChange={(open) => onOpenChange(open, toast.id)}
                        {...toast}
                    />
                ))}
                <ToastViewport />
            </RadixToastProvider>
        </ToastContext.Provider>
    );
}
