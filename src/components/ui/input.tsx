import { InputHTMLAttributes, forwardRef } from 'react';

const Input = forwardRef<
    HTMLInputElement,
    InputHTMLAttributes<HTMLInputElement>
>(({ className = '', type, ...props }, ref) => {
    const classes = ['input', className].filter(Boolean).join(' ');

    return <input type={type} className={classes} ref={ref} {...props} />;
});

Input.displayName = 'Input';

export { Input };
