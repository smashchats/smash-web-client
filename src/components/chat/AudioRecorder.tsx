import { Mic, Square } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { IMMediaEmbedded } from 'smash-node-lib';

import { logger } from '../../lib/logger';

interface AudioRecorderProps {
    onRecordingComplete: (message: IMMediaEmbedded) => void;
    disabled?: boolean;
    chatInputRef?: React.RefObject<HTMLTextAreaElement | null>;
}

// Define the WebKit AudioContext type
interface WebKitAudioContext extends AudioContext {
    createGainNode(): GainNode;
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

    const getRecordingMimeType = () => {
        // Use WebM with Opus codec for best compatibility
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
            return 'audio/webm;codecs=opus';
        }
        // Fallback to basic WebM
        return 'audio/webm';
    };

    const convertBlobToWav = async (blob: Blob): Promise<Blob> => {
        const AudioContextClass =
            window.AudioContext ||
            (
                window as unknown as {
                    webkitAudioContext: new () => WebKitAudioContext;
                }
            ).webkitAudioContext;
        const audioContext = new AudioContextClass();
        const arrayBuffer = await blob.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        // Create WAV file
        const numberOfChannels = audioBuffer.numberOfChannels;
        const length = audioBuffer.length * numberOfChannels * 2;
        const buffer = new ArrayBuffer(44 + length);
        const view = new DataView(buffer);

        // WAV header
        const writeString = (
            view: DataView,
            offset: number,
            string: string,
        ) => {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        };

        writeString(view, 0, 'RIFF');
        view.setUint32(4, 36 + length, true);
        writeString(view, 8, 'WAVE');
        writeString(view, 12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, numberOfChannels, true);
        view.setUint32(24, audioBuffer.sampleRate, true);
        view.setUint32(28, audioBuffer.sampleRate * numberOfChannels * 2, true);
        view.setUint16(32, numberOfChannels * 2, true);
        view.setUint16(34, 16, true);
        writeString(view, 36, 'data');
        view.setUint32(40, length, true);

        // Write audio data
        const offset = 44;
        const channelData = [];
        for (let i = 0; i < numberOfChannels; i++) {
            channelData.push(audioBuffer.getChannelData(i));
        }

        let index = 0;
        while (index < audioBuffer.length) {
            for (let i = 0; i < numberOfChannels; i++) {
                const sample = channelData[i][index] * 0x7fff;
                view.setInt16(
                    offset + (index * numberOfChannels + i) * 2,
                    sample < 0 ? Math.ceil(sample) : Math.floor(sample),
                    true,
                );
            }
            index++;
        }

        return new Blob([buffer], { type: 'audio/wav' });
    };

    const requestPermission = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100,
                    channelCount: 1,
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

            const recordingMimeType = getRecordingMimeType();
            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: recordingMimeType,
            });

            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                try {
                    const audioBlob = new Blob(audioChunksRef.current, {
                        type: recordingMimeType,
                    });

                    // Convert to WAV for better compatibility
                    const wavBlob = await convertBlobToWav(audioBlob);
                    const message = await IMMediaEmbedded.fromFile(wavBlob);
                    onRecordingComplete(message);

                    setRecordingTime(0);
                    if (timerRef.current) {
                        window.clearInterval(timerRef.current);
                        timerRef.current = null;
                    }
                } catch (err) {
                    logger.error('Failed to process recording', { error: err });
                }
            };

            mediaRecorder.start();
            setIsRecording(true);

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

            const wasFocused = document.activeElement === chatInputRef?.current;

            isHoldingRef.current = true;
            pressTimerRef.current = window.setTimeout(async () => {
                if (isHoldingRef.current) {
                    await startRecording();
                    if (wasFocused && chatInputRef?.current) {
                        chatInputRef.current.focus();
                    }
                }
            }, 200);
        },
        [disabled, startRecording, chatInputRef],
    );

    const handlePressEnd = useCallback(
        (e: React.MouseEvent | React.TouchEvent) => {
            e.preventDefault();
            isHoldingRef.current = false;

            const wasFocused = document.activeElement === chatInputRef?.current;

            if (pressTimerRef.current) {
                window.clearTimeout(pressTimerRef.current);
                pressTimerRef.current = null;
            }

            if (isRecording) {
                stopRecording();
            } else if (!isHoldingRef.current) {
                startRecording();
            }

            if (wasFocused && chatInputRef?.current) {
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
