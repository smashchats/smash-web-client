import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

let globalVideoRef: HTMLVideoElement | null = null;

export function useCamera() {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [hasPermission, setHasPermission] = useState(false);
    const [devices, setDevices] = useState<{
        front: MediaDeviceInfo | null;
        back: MediaDeviceInfo | null;
    }>({ front: null, back: null });
    const [isFront, setIsFront] = useState(true);

    const multipleDevices = useMemo(() => {
        return (
            Boolean(devices.front && devices.back) &&
            devices.front?.deviceId !== devices.back?.deviceId
        );
    }, [devices]);

    useEffect(() => {
        async function requestPermission() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                });
                setHasPermission(true);
                stream.getTracks().forEach((track) => track.stop());
            } catch (err) {
                console.error(
                    'Permission denied or error accessing camera',
                    err,
                );
            }
        }
        requestPermission();
    }, []);

    useEffect(() => {
        if (!hasPermission) return;

        async function loadDevices() {
            const allDevices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = allDevices.filter(
                (d) => d.kind === 'videoinput',
            );

            const front = videoDevices.find((d) =>
                /front|selfie|facetime/i.test(d.label),
            );
            const back = videoDevices.find((d) =>
                /back|rear|environment/i.test(d.label),
            );

            const fallbackFront = videoDevices[0] || null;
            const fallbackBack =
                videoDevices.length > 1 ? videoDevices[1] : fallbackFront;

            setDevices({
                front: front || fallbackFront,
                back: back || fallbackBack,
            });
        }

        loadDevices();
    }, [hasPermission]);

    const toggleDevice = useCallback(() => {
        setIsFront((prev) => !prev);
    }, []);

    const getCameraStream = useCallback(
        async (useFront: boolean) => {
            const deviceId = useFront
                ? devices.front?.deviceId
                : devices.back?.deviceId;
            if (!deviceId) return;

            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { deviceId },
                    audio: false,
                });

                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    globalVideoRef = videoRef.current;
                }
            } catch (err) {
                console.error('Error getting camera stream', err);
            }
        },
        [devices],
    );

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
        if (!videoElement) return null;

        const canvas = document.createElement('canvas');
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        if (isFront) {
            ctx.scale(-1, 1);
            ctx.translate(-canvas.width, 0);
        }

        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/jpeg');
    }, [isFront]);

    useEffect(() => {
        if ((isFront && devices.front) || (!isFront && devices.back)) {
            getCameraStream(isFront);
        }

        return () => stopCamera();
    }, [devices, isFront, getCameraStream, stopCamera]);

    return {
        videoRef,
        capturePhoto,
        devices,
        isFront,
        toggleDevice,
        multipleDevices,
    };
}
