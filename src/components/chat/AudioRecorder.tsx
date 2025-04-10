import { Mic, Square } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { IMMediaEmbedded } from 'smash-node-lib';

import { logger } from '../../lib/logger';

interface AudioRecorderProps {
    onRecordingComplete: (message: IMMediaEmbedded) => void;
    disabled?: boolean;
}

export function AudioRecorder({
    onRecordingComplete,
    disabled = false,
}: AudioRecorderProps) {
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<number | null>(null);

    const getMimeType = () => {
        // Try WebM first (for Chrome, Firefox, Edge)
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
            return 'audio/webm;codecs=opus';
        }
        // Fallback to MP4 for Safari
        if (MediaRecorder.isTypeSupported('audio/mp4')) {
            return 'audio/mp4';
        }
        // Last resort fallback
        return 'audio/webm';
    };

    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100,
                },
            });

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
                stream.getTracks().forEach((track) => track.stop());
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
        }
    }, [onRecordingComplete]);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    }, [isRecording]);

    useEffect(() => {
        return () => {
            if (timerRef.current) {
                window.clearInterval(timerRef.current);
            }
        };
    }, []);

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className={`audio-recorder ${disabled ? 'disabled' : ''}`}>
            <button
                className="audio-recorder-button"
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onMouseLeave={stopRecording}
                onTouchStart={startRecording}
                onTouchEnd={stopRecording}
                disabled={disabled || isRecording}
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
