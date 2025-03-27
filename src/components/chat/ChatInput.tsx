import { Send } from 'lucide-react';
import { useState } from 'react';
import { IMMediaEmbedded } from 'smash-node-lib';

import { logger } from '../../lib/logger';
import { MediaUpload } from './MediaUpload';

interface ChatInputProps {
    onSendMessage: (message: string | IMMediaEmbedded) => void;
    isLoading?: boolean;
    onFocus?: () => void;
}

interface SendButtonProps {
    isLoading: boolean;
    disabled: boolean;
}

function SendButton({ isLoading, disabled }: SendButtonProps) {
    return (
        <button
            type="submit"
            disabled={disabled}
            className="send-button"
            aria-label="Send message"
        >
            {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
                <Send className="w-5 h-5" />
            )}
        </button>
    );
}

export function ChatInput({
    onSendMessage,
    isLoading = false,
    onFocus,
}: ChatInputProps) {
    const [message, setMessage] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (message.trim() && !isLoading) {
            logger.debug('Sending message', { messageLength: message.length });
            onSendMessage(message);
            setMessage('');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    const handleMediaSelect = async (mediaMessage: IMMediaEmbedded) => {
        setIsProcessing(true);
        try {
            onSendMessage(mediaMessage);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="chat-input-container">
            <div className="chat-input-wrapper">
                <MediaUpload
                    onMediaSelect={handleMediaSelect}
                    disabled={isLoading || isProcessing}
                />
                <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="chat-input"
                    disabled={isLoading || isProcessing}
                    rows={1}
                    onKeyDown={handleKeyDown}
                    onFocus={onFocus}
                />
                <SendButton
                    isLoading={isLoading || isProcessing}
                    disabled={!message.trim() || isLoading || isProcessing}
                />
            </div>
        </form>
    );
}
