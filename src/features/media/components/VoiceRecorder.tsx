import { Mic, Square } from 'lucide-react';
import { useCallback } from 'react';
import { IMMediaEmbedded } from 'smash-node-lib';

import { useRecordAudio } from '../hooks/useRecordAudio';
import './VoiceRecorder.css';

interface VoiceRecorderProps {
    onRecordingComplete: (message: IMMediaEmbedded) => void;
    disabled?: boolean;
    chatInputRef?: React.RefObject<HTMLTextAreaElement | null>;
    variant?: 'button' | 'floating';
    size?: 'sm' | 'md' | 'lg';
}

export function VoiceRecorder({
    onRecordingComplete,
    disabled = false,
    chatInputRef,
    variant = 'button',
    size = 'md',
}: Readonly<VoiceRecorderProps>) {
    const { state, startRecording, stopRecording } =
        useRecordAudio(onRecordingComplete);

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handlePressStart = useCallback(
        async (e: React.MouseEvent | React.TouchEvent) => {
            e.preventDefault();
            if (disabled || state.isProcessing) return;

            const wasFocused = document.activeElement === chatInputRef?.current;

            await startRecording();

            if (wasFocused && chatInputRef?.current) {
                chatInputRef.current.focus();
            }
        },
        [disabled, state.isProcessing, startRecording, chatInputRef],
    );

    const handlePressEnd = useCallback(
        (e: React.MouseEvent | React.TouchEvent) => {
            e.preventDefault();

            const wasFocused = document.activeElement === chatInputRef?.current;

            if (state.isRecording) {
                stopRecording();
            }

            if (wasFocused && chatInputRef?.current) {
                chatInputRef.current.focus();
            }
        },
        [state.isRecording, stopRecording, chatInputRef],
    );

    const buttonClasses = [
        'voice-recorder-button',
        `voice-recorder-button--${variant}`,
        `voice-recorder-button--${size}`,
        disabled || state.isProcessing ? 'voice-recorder-button--disabled' : '',
        state.isRecording ? 'voice-recorder-button--recording' : '',
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <div
            className={`voice-recorder ${disabled ? 'voice-recorder--disabled' : ''}`}
        >
            <button
                className={buttonClasses}
                onMouseDown={handlePressStart}
                onMouseUp={handlePressEnd}
                onTouchStart={handlePressStart}
                onTouchEnd={handlePressEnd}
                disabled={disabled || state.isProcessing}
                aria-label={
                    state.isRecording ? 'Stop recording' : 'Start recording'
                }
            >
                {state.isProcessing ? (
                    <div className="voice-recorder-spinner">
                        <div className="spinner-dot"></div>
                        <div className="spinner-dot"></div>
                        <div className="spinner-dot"></div>
                    </div>
                ) : state.isRecording ? (
                    <>
                        <div className="recording-indicator">
                            <div className="recording-pulse"></div>
                            <Square className="recording-icon" />
                        </div>
                        {variant === 'button' && (
                            <span className="recording-time">
                                {formatTime(state.recordingTime)}
                            </span>
                        )}
                    </>
                ) : (
                    <Mic className="mic-icon" />
                )}
            </button>

            {state.error && (
                <div className="voice-recorder-error" role="alert">
                    {state.error}
                </div>
            )}
        </div>
    );
}
