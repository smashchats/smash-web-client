import { Send } from 'lucide-react';
import { useState } from 'react';

interface ChatInputProps {
    onSendMessage: (message: string) => void;
    isLoading?: boolean;
}

export function ChatInput({ onSendMessage, isLoading }: ChatInputProps) {
    const [message, setMessage] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (message.trim() && !isLoading) {
            onSendMessage(message);
            setMessage('');
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
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSubmit(e);
                        }
                    }}
                />
                <button
                    type="submit"
                    disabled={!message.trim() || isLoading}
                    className="send-button"
                    aria-label="Send message"
                >
                    {isLoading ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <Send className="w-5 h-5" />
                    )}
                </button>
            </div>
        </form>
    );
}
