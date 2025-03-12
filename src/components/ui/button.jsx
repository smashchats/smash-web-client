import { Slot } from '@radix-ui/react-slot';
import * as React from 'react';

import { cn } from '../../lib/utils';

const Button = React.forwardRef(
    (
        {
            className = '',
            variant = 'default',
            size = 'default',
            asChild = false,
            ...props
        },
        ref,
    ) => {
        const Comp = asChild ? Slot : 'button';
        const baseClass = 'button';
        const variantClass = `button--${variant}`;
        const sizeClass = `button--${size}`;
        const classes = cn(baseClass, variantClass, sizeClass, className);

        return <Comp className={classes} ref={ref} {...props} />;
    },
);

Button.displayName = 'Button';

export { Button };
