import { useCaptureMedia } from '@features/media/hooks/useCaptureMedia';
import { useDevicePermissions } from '@features/media/hooks/useDevicePermissions';
import { type ProcessedMedia } from '@services/mediaService';
import { Camera, CameraOff, RotateCcw, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import './CameraCapture.css';

interface CameraCaptureProps {
    onCapture: (media: ProcessedMedia) => void;
    onClose: () => void;
    isOpen: boolean;
    mode?: 'photo' | 'video';
    maxDuration?: number; // for video mode in seconds
}

export function CameraCapture({
    onCapture,
    onClose,
    isOpen,
    mode = 'photo',
    maxDuration = 30,
}: Readonly<CameraCaptureProps>) {
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [videoRecorder, setVideoRecorder] = useState<{
        start: () => void;
        stop: () => Promise<Blob | null>;
    } | null>(null);

    const { permissions, requestCameraPermission } = useDevicePermissions();

    const {
        state: cameraState,
        videoRef,
        startCamera,
        stopCamera,
        switchCamera,
        capturePhoto,
        captureVideo,
    } = useCaptureMedia();

    const handleInitializeCamera = useCallback(async () => {
        if (permissions.camera !== 'granted') {
            const granted = await requestCameraPermission();
            if (!granted) return;
        }
        await startCamera();
    }, [permissions.camera, requestCameraPermission, startCamera]);

    // Initialize camera when component opens
    useEffect(() => {
        if (isOpen && !cameraState.isActive) {
            handleInitializeCamera();
        } else if (!isOpen && cameraState.isActive) {
            stopCamera();
        }
    }, [isOpen, cameraState.isActive, handleInitializeCamera, stopCamera]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopCamera();
        };
    }, [stopCamera]);

    const handleStopRecording = useCallback(async () => {
        if (videoRecorder && isRecording) {
            const blob = await videoRecorder.stop();
            if (blob) {
                const processedMedia: ProcessedMedia = {
                    id: `video_${Date.now()}`,
                    type: 'video',
                    blob,
                    mediaMessage: await import('smash-node-lib').then(
                        ({ IMMediaEmbedded }) => IMMediaEmbedded.fromFile(blob),
                    ),
                    preview: URL.createObjectURL(blob),
                };
                onCapture(processedMedia);
            }
            setIsRecording(false);
            setRecordingTime(0);
            setVideoRecorder(null);
        }
    }, [videoRecorder, isRecording, onCapture]);

    const handleCapture = useCallback(async () => {
        try {
            if (mode === 'photo') {
                const blob = await capturePhoto({
                    quality: 0.92,
                    format: 'image/jpeg',
                });

                if (blob) {
                    const processedMedia: ProcessedMedia = {
                        id: `photo_${Date.now()}`,
                        type: 'image',
                        blob,
                        mediaMessage: await import('smash-node-lib').then(
                            ({ IMMediaEmbedded }) =>
                                IMMediaEmbedded.fromFile(blob),
                        ),
                        preview: URL.createObjectURL(blob),
                    };
                    onCapture(processedMedia);
                }
            } else if (mode === 'video') {
                if (!isRecording) {
                    // Start recording
                    const recorder = await captureVideo();
                    setVideoRecorder(recorder);
                    recorder.start();
                    setIsRecording(true);

                    // Start timer
                    const timer = setInterval(() => {
                        setRecordingTime((prev) => {
                            if (prev >= maxDuration - 1) {
                                handleStopRecording();
                                return prev;
                            }
                            return prev + 1;
                        });
                    }, 1000);

                    // Auto-stop after max duration
                    setTimeout(() => {
                        clearInterval(timer);
                        handleStopRecording();
                    }, maxDuration * 1000);
                } else {
                    handleStopRecording();
                }
            }
        } catch (err) {
            console.error('Failed to capture media:', err);
        }
    }, [
        mode,
        capturePhoto,
        onCapture,
        isRecording,
        captureVideo,
        maxDuration,
        handleStopRecording,
    ]);

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (!isOpen) return null;

    return (
        <div className="camera-capture-overlay">
            <div className="camera-capture-container">
                {/* Header */}
                <div className="camera-capture-header">
                    <button
                        className="camera-capture-close"
                        onClick={onClose}
                        aria-label="Close camera"
                    >
                        <X className="w-6 h-6" />
                    </button>

                    {mode === 'video' && isRecording && (
                        <div className="recording-indicator-header">
                            <div className="recording-dot"></div>
                            <span className="recording-time-header">
                                {formatTime(recordingTime)} /{' '}
                                {formatTime(maxDuration)}
                            </span>
                        </div>
                    )}
                </div>

                {/* Camera view */}
                <div className="camera-view-container">
                    {cameraState.isLoading ? (
                        <div className="camera-loading">
                            <Camera className="w-12 h-12 animate-pulse" />
                            <span>Starting camera...</span>
                        </div>
                    ) : cameraState.error ? (
                        <div className="camera-error">
                            <CameraOff className="w-12 h-12" />
                            <span>{cameraState.error}</span>
                            <button
                                className="btn-primary btn-size-sm"
                                onClick={handleInitializeCamera}
                            >
                                Try Again
                            </button>
                        </div>
                    ) : (
                        <video
                            ref={videoRef}
                            className="camera-video"
                            autoPlay
                            playsInline
                            muted
                        />
                    )}
                </div>

                {/* Controls */}
                <div className="camera-controls">
                    {cameraState.devices.length > 1 && (
                        <button
                            className="camera-control-button"
                            onClick={switchCamera}
                            disabled={!cameraState.isActive}
                            aria-label="Switch camera"
                        >
                            <RotateCcw className="w-6 h-6" />
                        </button>
                    )}

                    <button
                        className={`camera-capture-button ${isRecording ? 'camera-capture-button--recording' : ''}`}
                        onClick={handleCapture}
                        disabled={!cameraState.isActive}
                        aria-label={
                            mode === 'photo'
                                ? 'Capture photo'
                                : isRecording
                                  ? 'Stop recording'
                                  : 'Start recording'
                        }
                    >
                        <div className="camera-capture-button-inner">
                            {isRecording && (
                                <div className="recording-pulse"></div>
                            )}
                        </div>
                    </button>

                    {/* Placeholder for symmetry */}
                    <div className="camera-control-placeholder"></div>
                </div>
            </div>
        </div>
    );
}
