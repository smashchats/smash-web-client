import { useCallback, useEffect, useRef, useState } from 'react';

import { logger } from '../../../utils/logger';

export interface CameraState {
    isActive: boolean;
    isLoading: boolean;
    error: string | null;
    devices: MediaDeviceInfo[];
    currentDeviceId: string | null;
    stream: MediaStream | null;
    hasPermission: boolean | null;
}

export interface CaptureOptions {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'image/jpeg' | 'image/png' | 'image/webp';
}

export interface UseCaptureMediaResult {
    state: CameraState;
    videoRef: React.RefObject<HTMLVideoElement>;
    startCamera: (deviceId?: string) => Promise<boolean>;
    stopCamera: () => void;
    switchCamera: () => Promise<void>;
    capturePhoto: (options?: CaptureOptions) => Promise<Blob | null>;
    captureVideo: (duration?: number) => Promise<{
        start: () => void;
        stop: () => Promise<Blob | null>;
    }>;
    refreshDevices: () => Promise<void>;
}

export function useCaptureMedia(): UseCaptureMediaResult {
    const [state, setState] = useState<CameraState>({
        isActive: false,
        isLoading: false,
        error: null,
        devices: [],
        currentDeviceId: null,
        stream: null,
        hasPermission: null,
    });

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const videoRecorderRef = useRef<MediaRecorder | null>(null);
    const videoChunksRef = useRef<Blob[]>([]);

    const refreshDevices = useCallback(async (): Promise<void> => {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(
                (device) => device.kind === 'videoinput',
            );

            setState((prev) => ({
                ...prev,
                devices: videoDevices,
            }));
        } catch (err) {
            logger.error('Failed to enumerate devices', { error: err });
            setState((prev) => ({
                ...prev,
                error: 'Failed to access camera devices',
            }));
        }
    }, []);

    const stopCamera = useCallback(() => {
        if (state.stream) {
            state.stream.getTracks().forEach((track) => track.stop());
        }

        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }

        setState((prev) => ({
            ...prev,
            isActive: false,
            stream: null,
            currentDeviceId: null,
        }));
    }, [state.stream]);

    const startCamera = useCallback(
        async (deviceId?: string): Promise<boolean> => {
            setState((prev) => ({ ...prev, isLoading: true, error: null }));

            try {
                // Stop any existing stream
                stopCamera();

                const constraints: MediaStreamConstraints = {
                    video: deviceId
                        ? { deviceId: { exact: deviceId } }
                        : {
                              width: { ideal: 1920, max: 1920 },
                              height: { ideal: 1080, max: 1080 },
                              facingMode: 'user',
                          },
                };

                const stream =
                    await navigator.mediaDevices.getUserMedia(constraints);

                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }

                const videoTrack = stream.getVideoTracks()[0];
                const currentDeviceId =
                    videoTrack?.getSettings()?.deviceId || null;

                setState((prev) => ({
                    ...prev,
                    isActive: true,
                    isLoading: false,
                    hasPermission: true,
                    stream,
                    currentDeviceId,
                    error: null,
                }));

                // Refresh devices after successful permission
                await refreshDevices();
                return true;
            } catch (err) {
                logger.error('Failed to start camera', { error: err });
                setState((prev) => ({
                    ...prev,
                    isLoading: false,
                    hasPermission: false,
                    error: 'Failed to access camera',
                }));
                return false;
            }
        },
        [stopCamera, refreshDevices],
    );

    const switchCamera = useCallback(async (): Promise<void> => {
        if (state.devices.length <= 1) return;

        const currentIndex = state.devices.findIndex(
            (device) => device.deviceId === state.currentDeviceId,
        );
        const nextIndex = (currentIndex + 1) % state.devices.length;
        const nextDevice = state.devices[nextIndex];

        if (nextDevice) {
            await startCamera(nextDevice.deviceId);
        }
    }, [state.devices, state.currentDeviceId, startCamera]);

    const capturePhoto = useCallback(
        async (options: CaptureOptions = {}): Promise<Blob | null> => {
            if (!videoRef.current || !state.isActive) {
                logger.error(
                    'Camera not active or video element not available',
                );
                return null;
            }

            try {
                const video = videoRef.current;
                const {
                    width = video.videoWidth,
                    height = video.videoHeight,
                    quality = 0.92,
                    format = 'image/jpeg',
                } = options;

                // Create canvas if it doesn't exist
                if (!canvasRef.current) {
                    canvasRef.current = document.createElement('canvas');
                }

                const canvas = canvasRef.current;
                const ctx = canvas.getContext('2d');

                if (!ctx) {
                    throw new Error('Failed to get canvas context');
                }

                canvas.width = width;
                canvas.height = height;

                // Draw video frame to canvas
                ctx.drawImage(video, 0, 0, width, height);

                return new Promise((resolve) => {
                    canvas.toBlob(
                        (blob) => {
                            resolve(blob);
                        },
                        format,
                        quality,
                    );
                });
            } catch (err) {
                logger.error('Failed to capture photo', { error: err });
                return null;
            }
        },
        [state.isActive],
    );

    const captureVideo = useCallback(
        async (
            duration?: number,
        ): Promise<{
            start: () => void;
            stop: () => Promise<Blob | null>;
        }> => {
            if (!state.stream) {
                throw new Error('Camera stream not available');
            }

            const mimeType = MediaRecorder.isTypeSupported('video/webm')
                ? 'video/webm'
                : 'video/mp4';

            const mediaRecorder = new MediaRecorder(state.stream, {
                mimeType,
            });

            videoRecorderRef.current = mediaRecorder;
            videoChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    videoChunksRef.current.push(event.data);
                }
            };

            const start = () => {
                mediaRecorder.start();
                if (duration) {
                    setTimeout(() => {
                        if (mediaRecorder.state === 'recording') {
                            mediaRecorder.stop();
                        }
                    }, duration);
                }
            };

            const stop = (): Promise<Blob | null> => {
                return new Promise((resolve) => {
                    mediaRecorder.onstop = () => {
                        if (videoChunksRef.current.length > 0) {
                            const blob = new Blob(videoChunksRef.current, {
                                type: mimeType,
                            });
                            resolve(blob);
                        } else {
                            resolve(null);
                        }
                    };

                    if (mediaRecorder.state === 'recording') {
                        mediaRecorder.stop();
                    } else {
                        resolve(null);
                    }
                });
            };

            return { start, stop };
        },
        [state.stream],
    );

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopCamera();
        };
    }, [stopCamera]);

    // Initial device enumeration
    useEffect(() => {
        refreshDevices();
    }, [refreshDevices]);

    return {
        state,
        videoRef,
        startCamera,
        stopCamera,
        switchCamera,
        capturePhoto,
        captureVideo,
        refreshDevices,
    };
}
