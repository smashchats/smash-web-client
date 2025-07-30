import { ChevronDown, ChevronUp } from 'lucide-react';

import './UnreadMessageIndicator.css';

interface UnreadMessageIndicatorProps {
    direction: 'above' | 'below';
    onClick: () => void;
}

export const UnreadMessageIndicator = ({
    direction,
    onClick,
}: Readonly<UnreadMessageIndicatorProps>) => {
    const isAbove = direction === 'above';
    const Icon = isAbove ? ChevronUp : ChevronDown;
    const text = isAbove ? 'Unread messages above' : 'Unread messages below';
    const positionClass = isAbove ? 'top-20' : 'bottom-32';

    return (
        <div
            className={`fixed ${positionClass} left-1/2 transform -translate-x-1/2 z-[60]`}
        >
            <button
                onClick={onClick}
                className="cursor-pointer inline-flex items-center gap-2 px-6 py-2 rounded-full text-xs font-medium text-white shadow-lg transition-all duration-200 hover:shadow-xl whitespace-nowrap unread-message-indicator"
            >
                <Icon size={14} />
                <span>{text}</span>
            </button>
        </div>
    );
};
