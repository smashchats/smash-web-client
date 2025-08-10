import { useCallback, useEffect, useRef, useState } from 'react';
import { IMMediaEmbedded } from 'smash-node-lib';

import { logger } from '../../../utils/logger';

export interface AudioRecordingState {
    isRecording: boolean;
    recordingTime: number;
    hasPermission: boolean | null;
    isProcessing: boolean;
    error: string | null;
}

export interface UseRecordAudioResult {
    state: AudioRecordingState;
    startRecording: () => Promise<boolean>;
    stopRecording: () => void;
    toggleRecording: () => Promise<void>;
    resetRecording: () => void;
}

// Define the WebKit AudioContext type
interface WebKitAudioContext extends AudioContext {
    createGainNode(): GainNode;
}

export function useRecordAudio(
    onRecordingComplete?: (message: IMMediaEmbedded) => void,
): UseRecordAudioResult {
    const [state, setState] = useState<AudioRecordingState>({
        isRecording: false,
        recordingTime: 0,
        hasPermission: null,
        isProcessing: false,
        error: null,
    });

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<number | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const getRecordingMimeType = useCallback((): string => {
        // Use WebM with Opus codec for best compatibility
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
            return 'audio/webm;codecs=opus';
        }
        // Fallback to basic WebM
        return 'audio/webm';
    }, []);

    const convertBlobToWav = useCallback(async (blob: Blob): Promise<Blob> => {
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
    }, []);

    const requestPermission = useCallback(async (): Promise<boolean> => {
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
            setState((prev) => ({ ...prev, hasPermission: true, error: null }));
            return true;
        } catch (err) {
            logger.error('Failed to get microphone permission', { error: err });
            setState((prev) => ({
                ...prev,
                hasPermission: false,
                error: 'Microphone permission denied',
            }));
            return false;
        }
    }, []);

    const startRecording = useCallback(async (): Promise<boolean> => {
        if (state.isRecording) return true;

        setState((prev) => ({ ...prev, error: null, isProcessing: true }));

        try {
            // Check for permission first
            if (!state.hasPermission) {
                const granted = await requestPermission();
                if (!granted) {
                    setState((prev) => ({ ...prev, isProcessing: false }));
                    return false;
                }
            }

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
                setState((prev) => ({ ...prev, isProcessing: true }));
                try {
                    const audioBlob = new Blob(audioChunksRef.current, {
                        type: recordingMimeType,
                    });

                    // Convert to WAV for better compatibility
                    const wavBlob = await convertBlobToWav(audioBlob);
                    const message = await IMMediaEmbedded.fromFile(wavBlob);

                    if (onRecordingComplete) {
                        onRecordingComplete(message);
                    }

                    setState((prev) => ({
                        ...prev,
                        recordingTime: 0,
                        isProcessing: false,
                    }));

                    if (timerRef.current) {
                        window.clearInterval(timerRef.current);
                        timerRef.current = null;
                    }
                } catch (err) {
                    logger.error('Failed to process recording', { error: err });
                    setState((prev) => ({
                        ...prev,
                        error: 'Failed to process recording',
                        isProcessing: false,
                    }));
                }
            };

            mediaRecorder.start();
            setState((prev) => ({
                ...prev,
                isRecording: true,
                isProcessing: false,
            }));

            timerRef.current = window.setInterval(() => {
                setState((prev) => ({
                    ...prev,
                    recordingTime: prev.recordingTime + 1,
                }));
            }, 1000);

            return true;
        } catch (err) {
            logger.error('Failed to start recording', { error: err });
            setState((prev) => ({
                ...prev,
                isRecording: false,
                error: 'Failed to start recording',
                isProcessing: false,
            }));
            return false;
        }
    }, [
        state.hasPermission,
        state.isRecording,
        requestPermission,
        getRecordingMimeType,
        convertBlobToWav,
        onRecordingComplete,
    ]);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && state.isRecording) {
            mediaRecorderRef.current.stop();
            setState((prev) => ({ ...prev, isRecording: false }));
        }
    }, [state.isRecording]);

    const toggleRecording = useCallback(async () => {
        if (state.isRecording) {
            stopRecording();
        } else {
            await startRecording();
        }
    }, [state.isRecording, startRecording, stopRecording]);

    const resetRecording = useCallback(() => {
        if (timerRef.current) {
            window.clearInterval(timerRef.current);
            timerRef.current = null;
        }

        if (mediaRecorderRef.current && state.isRecording) {
            mediaRecorderRef.current.stop();
        }

        setState({
            isRecording: false,
            recordingTime: 0,
            hasPermission: state.hasPermission,
            isProcessing: false,
            error: null,
        });
    }, [state.hasPermission, state.isRecording]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((track) => track.stop());
            }
            if (timerRef.current) {
                window.clearInterval(timerRef.current);
            }
        };
    }, []);

    return {
        state,
        startRecording,
        stopRecording,
        toggleRecording,
        resetRecording,
    };
}
