import { useCallback, useEffect, useRef } from 'react';

// Create a singleton for storing the video element reference
let globalVideoRef: HTMLVideoElement | null = null;

export function useCamera() {
    const videoRef = useRef<HTMLVideoElement>(null);

    const startCamera = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'user',
                    width: { ideal: window.innerWidth },
                    height: { ideal: window.innerHeight },
                },
                audio: false,
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                // Store the reference globally
                globalVideoRef = videoRef.current;
            }
        } catch (err) {
            console.error('Camera error', err);
        }
    }, []);

    const stopCamera = useCallback(() => {
        if (videoRef.current?.srcObject) {
            const tracks = (
                videoRef.current.srcObject as MediaStream
            ).getTracks();
            tracks.forEach((t) => t.stop());
            globalVideoRef = null;
        }
    }, []);

    const capturePhoto = useCallback(() => {
        const videoElement = globalVideoRef || videoRef.current;
        if (!videoElement) {
            console.error('No video element available for capture');
            return null;
        }

        const canvas = document.createElement('canvas');
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            console.error('Could not get canvas context');
            return null;
        }

        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/jpeg');
    }, []);

    useEffect(() => {
        startCamera();
        return () => stopCamera();
    }, [startCamera, stopCamera]);

    return { videoRef, capturePhoto };
}
