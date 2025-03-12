import { ButtonHTMLAttributes, forwardRef } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?:
        | 'default'
        | 'destructive'
        | 'outline'
        | 'secondary'
        | 'ghost'
        | 'link';
    size?: 'default' | 'sm' | 'lg' | 'icon';
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    (
        { className = '', variant = 'default', size = 'default', ...props },
        ref,
    ) => {
        const baseClasses = 'button';
        const variantClasses = `button--${variant}`;
        const sizeClasses = `button--${size}`;
        const classes = [baseClasses, variantClasses, sizeClasses, className]
            .filter(Boolean)
            .join(' ');

        return <button className={classes} ref={ref} {...props} />;
    },
);

Button.displayName = 'Button';

export { Button };
