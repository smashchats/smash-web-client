import { cn } from '@shared/utils/cn';

type LoadingVariant = 'spinner' | 'skeleton' | 'dots';
type LoadingSize = 'sm' | 'md' | 'lg';

interface LoadingStateProps {
    variant?: LoadingVariant;
    size?: LoadingSize;
    message?: string;
    className?: string;
}

const LoadingSpinner = ({ size }: { size: LoadingSize }) => {
    const sizeClasses = {
        sm: 'w-4 h-4',
        md: 'w-8 h-8',
        lg: 'w-12 h-12',
    };

    return (
        <div
            className={cn(
                'animate-spin rounded-full border-2 border-gray-300 border-t-primary-600',
                sizeClasses[size],
            )}
        ></div>
    );
};

const LoadingDots = ({ size }: { size: LoadingSize }) => {
    const dotSizes = {
        sm: 'w-1 h-1',
        md: 'w-2 h-2',
        lg: 'w-3 h-3',
    };

    const gapSizes = {
        sm: 'gap-1',
        md: 'gap-2',
        lg: 'gap-3',
    };

    return (
        <div className={cn('flex items-center', gapSizes[size])}>
            {[0, 1, 2].map((i) => (
                <div
                    key={i}
                    className={cn(
                        'bg-primary-600 rounded-full animate-pulse',
                        dotSizes[size],
                    )}
                    style={{
                        animationDelay: `${i * 0.2}s`,
                        animationDuration: '1s',
                    }}
                />
            ))}
        </div>
    );
};

const LoadingSkeleton = ({ size }: { size: LoadingSize }) => {
    const heights = {
        sm: 'h-16',
        md: 'h-32',
        lg: 'h-48',
    };

    return (
        <div className="space-y-3 w-full">
            <div
                className={cn(
                    'bg-gray-200 rounded animate-pulse',
                    heights[size],
                )}
            />
            <div className="flex space-x-3">
                <div className="w-1/3 h-4 bg-gray-200 rounded animate-pulse" />
                <div className="w-1/2 h-4 bg-gray-200 rounded animate-pulse" />
            </div>
        </div>
    );
};

export default function LoadingState({
    variant = 'spinner',
    size = 'md',
    message,
    className,
}: Readonly<LoadingStateProps>) {
    const renderLoading = () => {
        switch (variant) {
            case 'dots':
                return <LoadingDots size={size} />;
            case 'skeleton':
                return <LoadingSkeleton size={size} />;
            case 'spinner':
            default:
                return <LoadingSpinner size={size} />;
        }
    };

    return (
        <div
            className={cn(
                'flex flex-col items-center justify-center p-4',
                className,
            )}
        >
            {renderLoading()}
            {message && (
                <p className="mt-3 text-sm text-gray-600 text-center">
                    {message}
                </p>
            )}
        </div>
    );
}
