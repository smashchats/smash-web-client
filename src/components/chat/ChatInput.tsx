import { Send } from 'lucide-react';
import { useState } from 'react';

import { logger } from '../../lib/logger';

interface ChatInputProps {
    onSendMessage: (message: string) => void;
    isLoading?: boolean;
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
}: ChatInputProps) {
    const [message, setMessage] = useState('');

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

    return (
        <form onSubmit={handleSubmit} className="chat-input-container">
            <div className="chat-input-wrapper">
                <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="chat-input"
                    disabled={isLoading}
                    rows={1}
                    onKeyDown={handleKeyDown}
                />
                <SendButton
                    isLoading={isLoading}
                    disabled={!message.trim() || isLoading}
                />
            </div>
        </form>
    );
}
