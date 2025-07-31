import { cn } from '@utils/cn';
import type { InputHTMLAttributes } from 'react';
import { forwardRef } from 'react';

type InputVariant = 'default' | 'error' | 'success';
type InputSize = 'sm' | 'md' | 'lg';

type InputProps = {
    variant?: InputVariant;
    size?: InputSize;
    label?: string;
    helperText?: string;
    errorMessage?: string;
    isFullWidth?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
} & InputHTMLAttributes<HTMLInputElement>;

const inputVariants: Record<InputVariant, string> = {
    default: 'input-base',
    error: 'input-base input-error',
    success: 'input-base input-success',
};

const inputSizes: Record<InputSize, string> = {
    sm: 'text-sm min-h-9',
    md: 'text-base min-h-11',
    lg: 'text-lg min-h-12',
};

const Input = forwardRef<HTMLInputElement, InputProps>(
    (
        {
            variant = 'default',
            size = 'md',
            label,
            helperText,
            errorMessage,
            isFullWidth = false,
            leftIcon,
            rightIcon,
            className,
            id,
            ...props
        },
        ref,
    ) => {
        const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
        const hasError = variant === 'error' || !!errorMessage;
        const displayedHelperText = errorMessage || helperText;

        return (
            <div
                className={cn('flex flex-col gap-1.5', isFullWidth && 'w-full')}
            >
                {label && (
                    <label
                        htmlFor={inputId}
                        className="text-sm font-medium text-primary"
                    >
                        {label}
                    </label>
                )}

                <div className="relative">
                    {leftIcon && (
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted">
                            {leftIcon}
                        </div>
                    )}

                    <input
                        ref={ref}
                        id={inputId}
                        className={cn(
                            inputVariants[hasError ? 'error' : variant],
                            inputSizes[size as InputSize],
                            leftIcon ? 'pl-10' : '',
                            rightIcon ? 'pr-10' : '',
                            isFullWidth ? 'w-full' : '',
                            className,
                        )}
                        {...props}
                    />

                    {rightIcon && (
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-muted">
                            {rightIcon}
                        </div>
                    )}
                </div>

                {displayedHelperText && (
                    <p
                        className={cn(
                            'text-xs',
                            hasError ? 'text-error' : 'text-muted',
                        )}
                    >
                        {displayedHelperText}
                    </p>
                )}
            </div>
        );
    },
);

Input.displayName = 'Input';

export default Input;
