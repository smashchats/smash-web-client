import { Slot } from '@radix-ui/react-slot';
import * as React from 'react';

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    asChild?: boolean;
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
    size?: 'default' | 'sm' | 'lg' | 'icon';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className = '', variant = 'default', size = 'default', asChild = false, ...props }, ref) => {
        const Comp = asChild ? Slot : 'button';
        const baseClass = 'button';
        const variantClass = `button--${variant}`;
        const sizeClass = `button--${size}`;
        const classes = [baseClass, variantClass, sizeClass, className].filter(Boolean).join(' ');

        return (
            <Comp
                className={classes}
                ref={ref}
                {...props}
            />
        );
    },
);

Button.displayName = 'Button';

export { Button };
