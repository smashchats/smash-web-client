import { HTMLAttributes, forwardRef } from 'react';

import { cn } from '../../lib/utils';

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
        <div className={cn('card', className)} ref={ref} {...props} />
    ),
);

Card.displayName = 'Card';
