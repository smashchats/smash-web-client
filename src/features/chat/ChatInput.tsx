import { Send } from 'lucide-react';
import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { IMMediaEmbedded } from 'smash-node-lib';

import { logger } from '../../lib/logger';
import { AudioRecorder } from './AudioRecorder';
import './ChatInput.css';
import { MediaUpload } from './MediaUpload';

interface ChatInputProps {
    onSendMessage: (message: string | IMMediaEmbedded) => void;
    isLoading?: boolean;
    onFocus?: () => void;
}

export interface ChatInputRef {
    focus: () => void;
}

interface SendButtonProps {
    isLoading: boolean;
    disabled: boolean;
}

function SendButton({ isLoading, disabled }: Readonly<SendButtonProps>) {
    return (
        <button
            type="submit"
            disabled={disabled}
            className="chat-input-send-button"
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

export const ChatInput = forwardRef<ChatInputRef, ChatInputProps>(
    ({ onSendMessage, isLoading = false, onFocus }, ref) => {
        const [message, setMessage] = useState('');
        const [isProcessing, setIsProcessing] = useState(false);
        const textareaRef = useRef<HTMLTextAreaElement>(null);

        useImperativeHandle(ref, () => ({
            focus: () => {
                textareaRef.current?.focus();
            },
        }));

        const handleSubmit = (e: React.FormEvent) => {
            e.preventDefault();
            if (message.trim() && !isLoading) {
                logger.debug('Sending message', {
                    messageLength: message.length,
                });
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
                    <AudioRecorder
                        onRecordingComplete={handleMediaSelect}
                        disabled={isLoading || isProcessing}
                        chatInputRef={textareaRef}
                    />
                    <textarea
                        ref={textareaRef}
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
    },
);
