import * as ToastPrimitive from '@radix-ui/react-toast';
import * as React from 'react';

import { Button } from './button';

interface ToastProps {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    title?: string;
    description: string;
    action?: {
        label: string;
        onClick: () => void;
        altText: string;
    };
    duration?: number;
}

const ToastViewport = React.forwardRef<
    React.ElementRef<typeof ToastPrimitive.Viewport>,
    React.ComponentPropsWithoutRef<typeof ToastPrimitive.Viewport>
>(({ className = '', ...props }, ref) => (
    <ToastPrimitive.Viewport
        ref={ref}
        className={['toast-viewport', className].filter(Boolean).join(' ')}
        {...props}
    />
));
ToastViewport.displayName = ToastPrimitive.Viewport.displayName;

const Toast = React.forwardRef<
    React.ElementRef<typeof ToastPrimitive.Root>,
    React.ComponentPropsWithoutRef<typeof ToastPrimitive.Root> & ToastProps
>(({ className = '', title, description, action, ...props }, ref) => (
    <ToastPrimitive.Root
        ref={ref}
        className={['toast', className].filter(Boolean).join(' ')}
        {...props}
    >
        <div className="toast__content">
            {title && (
                <ToastPrimitive.Title className="toast__title">
                    {title}
                </ToastPrimitive.Title>
            )}
            <ToastPrimitive.Description className="toast__description">
                {description}
            </ToastPrimitive.Description>
        </div>
        <div className="toast__actions">
            {action && (
                <ToastPrimitive.Action
                    className="toast__action"
                    asChild
                    altText={action.altText}
                >
                    <Button variant="ghost" size="sm" onClick={action.onClick}>
                        {action.label}
                    </Button>
                </ToastPrimitive.Action>
            )}
            <ToastPrimitive.Close className="toast__close" asChild>
                <Button variant="ghost" size="sm">
                    <span aria-hidden>×</span>
                </Button>
            </ToastPrimitive.Close>
        </div>
    </ToastPrimitive.Root>
));
Toast.displayName = ToastPrimitive.Root.displayName;

const ToastProvider = ToastPrimitive.Provider;

export { Toast, ToastProvider, ToastViewport };
