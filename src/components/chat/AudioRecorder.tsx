import { Mic, Square } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { IMMediaEmbedded } from 'smash-node-lib';

import { logger } from '../../lib/logger';

interface AudioRecorderProps {
    onRecordingComplete: (message: IMMediaEmbedded) => void;
    disabled?: boolean;
    chatInputRef?: React.RefObject<HTMLTextAreaElement | null>;
}

export function AudioRecorder({
    onRecordingComplete,
    disabled = false,
    chatInputRef,
}: AudioRecorderProps) {
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<number | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const pressTimerRef = useRef<number | null>(null);
    const isHoldingRef = useRef(false);

    const getMimeType = () => {
        // Try MP4 first (for Chrome, Edge, safari, react-native)
        if (MediaRecorder.isTypeSupported('audio/mp4')) {
            return 'audio/mp4';
        }

        // Fallback to opus for Firefox, Edge, Chrome
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
            return 'audio/webm;codecs=opus';
        }

        // Last resort fallback
        return 'audio/webm';
    };

    const requestPermission = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100,
                },
            });
            streamRef.current = stream;
            setHasPermission(true);
            return true;
        } catch (err) {
            logger.error('Failed to get microphone permission', { error: err });
            setHasPermission(false);
            return false;
        }
    }, []);

    const startRecording = useCallback(async () => {
        if (!hasPermission) {
            const granted = await requestPermission();
            if (!granted) return;
        }

        try {
            const stream = streamRef.current;
            if (!stream) {
                throw new Error('No media stream available');
            }

            const mimeType = getMimeType();
            const mediaRecorder = new MediaRecorder(stream, {
                mimeType,
            });

            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, {
                    type: mimeType,
                });

                // For Safari compatibility, ensure we use a playback-friendly MIME type
                const playbackMimeType = mimeType.startsWith('audio/mp4')
                    ? 'audio/mp4'
                    : 'audio/webm';

                const playbackBlob = new Blob([audioBlob], {
                    type: playbackMimeType,
                });

                const message = await IMMediaEmbedded.fromFile(playbackBlob);
                onRecordingComplete(message);

                // Clean up
                setRecordingTime(0);
                if (timerRef.current) {
                    window.clearInterval(timerRef.current);
                    timerRef.current = null;
                }
            };

            mediaRecorder.start();
            setIsRecording(true);

            // Start timer
            timerRef.current = window.setInterval(() => {
                setRecordingTime((prev) => prev + 1);
            }, 1000);
        } catch (err) {
            logger.error('Failed to start recording', { error: err });
            setIsRecording(false);
        }
    }, [hasPermission, onRecordingComplete, requestPermission]);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    }, [isRecording]);

    // Clean up on unmount
    useEffect(() => {
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((track) => track.stop());
            }
            if (timerRef.current) {
                window.clearInterval(timerRef.current);
            }
            if (pressTimerRef.current) {
                window.clearTimeout(pressTimerRef.current);
            }
        };
    }, []);

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handlePressStart = useCallback(
        async (e: React.MouseEvent | React.TouchEvent) => {
            e.preventDefault();
            if (disabled) return;

            // Keep chat input focused to prevent keyboard from closing
            if (chatInputRef?.current) {
                chatInputRef.current.focus();
            }

            isHoldingRef.current = true;
            pressTimerRef.current = window.setTimeout(async () => {
                if (isHoldingRef.current) {
                    await startRecording();
                }
            }, 200); // 200ms threshold for press-and-hold
        },
        [disabled, startRecording, chatInputRef],
    );

    const handlePressEnd = useCallback(
        (e: React.MouseEvent | React.TouchEvent) => {
            e.preventDefault();
            isHoldingRef.current = false;

            if (pressTimerRef.current) {
                window.clearTimeout(pressTimerRef.current);
                pressTimerRef.current = null;
            }

            if (isRecording) {
                stopRecording();
            } else if (!isHoldingRef.current) {
                // If it was a quick press (not a hold), toggle recording
                startRecording();
            }

            // Keep chat input focused after recording
            if (chatInputRef?.current) {
                chatInputRef.current.focus();
            }
        },
        [isRecording, startRecording, stopRecording, chatInputRef],
    );

    return (
        <div className={`audio-recorder ${disabled ? 'disabled' : ''}`}>
            <button
                className="audio-recorder-button"
                onMouseDown={handlePressStart}
                onMouseUp={handlePressEnd}
                onTouchStart={handlePressStart}
                onTouchEnd={handlePressEnd}
                disabled={disabled}
            >
                {isRecording ? (
                    <>
                        <div className="recording-indicator">
                            <div className="recording-dot"></div>
                            <Square className="w-5 h-5 text-red-500" />
                        </div>
                        <span className="recording-time">
                            {formatTime(recordingTime)}
                        </span>
                    </>
                ) : (
                    <Mic className="w-5 h-5" />
                )}
            </button>
        </div>
    );
}
