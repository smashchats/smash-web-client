import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { forwardRef } from 'react';
import { cn } from '@shared/utils/cn';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
type ButtonSize = 'sm' | 'md' | 'lg';

type ButtonProps = {
    children: ReactNode;
    variant?: ButtonVariant;
    size?: ButtonSize;
    isLoading?: boolean;
    isFullWidth?: boolean;
} & ButtonHTMLAttributes<HTMLButtonElement>;

const buttonVariants: Record<ButtonVariant, string> = {
    primary: 'btn-primary',
    secondary: 'btn-secondary', 
    ghost: 'btn-ghost',
    danger: 'btn-danger',
    success: 'btn-success',
};

const buttonSizes: Record<ButtonSize, string> = {
    sm: 'btn-size-sm',
    md: 'btn-size-md',
    lg: 'btn-size-lg',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
    children,
    variant = 'primary',
    size = 'md',
    isLoading = false,
    isFullWidth = false,
    className,
    disabled,
    ...props
}, ref) => {
    return (
        <button
            ref={ref}
            disabled={disabled || isLoading}
            className={cn(
                // Base styles
                'btn-base',
                
                // Variant styles
                buttonVariants[variant],
                
                // Size styles  
                buttonSizes[size],
                
                // Width styles
                isFullWidth && 'btn-full-width',
                
                className
            )}
            {...props}
        >
            {isLoading && (
                <div className="btn-spinner">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                    >
                        <circle
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                            opacity="0.25"
                        />
                        <path
                            fill="currentColor"
                            opacity="0.75"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                    </svg>
                </div>
            )}
            {children}
        </button>
    );
});

Button.displayName = 'Button';

export default Button;
