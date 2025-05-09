import { forwardRef, useImperativeHandle } from 'react';

import { useCamera } from './useCamera';
import { useCaptureMedia } from './useCaptureMedia';

export interface CameraViewHandle {
    captureImage: () => void;
    captureImageToBlob: (callback: (blob: Blob | null) => void) => void;
}

const CameraView = forwardRef<CameraViewHandle>((_, ref) => {
    const { videoRef } = useCamera();
    const { saveMedia } = useCaptureMedia();

    useImperativeHandle(ref, () => ({
        captureImage: () => {
            const video = videoRef.current;
            if (!video) return;

            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            canvas.toBlob((blob) => {
                if (blob) saveMedia(blob, 'image');
            }, 'image/jpeg');
        },
        captureImageToBlob: (callback: (blob: Blob | null) => void) => {
            const video = videoRef.current;
            if (!video) return;

            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            canvas.toBlob((blob) => callback(blob), 'image/jpeg');
        },
    }));

    return (
        <div style={styles.wrapper}>
            <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                style={styles.video}
            />
        </div>
    );
});

export default CameraView;

const styles = {
    wrapper: {
        position: 'fixed' as const,
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        overflow: 'hidden',
        background: 'black',
    },
    video: {
        width: '100%',
        height: '100%',
        objectFit: 'cover' as const,
    },
};
