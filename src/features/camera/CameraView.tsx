import { forwardRef, useImperativeHandle } from 'react';

import './CameraView.css';

export interface CameraViewHandle {
    captureImageToBlob: (callback: (blob: Blob | null) => void) => void;
}

type Props = {
    shouldMirrorImage: boolean;
    videoRef: React.RefObject<HTMLVideoElement | null>;
};

const CameraView = forwardRef<CameraViewHandle, Props>(
    ({ shouldMirrorImage, videoRef }, ref) => {
        useImperativeHandle(ref, () => ({
            captureImageToBlob: (callback: (blob: Blob | null) => void) => {
                const video = videoRef.current;
                if (!video) return;

                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;

                const ctx = canvas.getContext('2d');
                if (!ctx) return;

                if (shouldMirrorImage) {
                    ctx.scale(-1, 1);
                    ctx.translate(-canvas.width, 0);
                }

                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                canvas.toBlob((blob) => {
                    if (blob) callback(blob);
                }, 'image/jpeg');
            },
        }));

        return (
            <div className="camera-view">
                <video
                    className={shouldMirrorImage ? 'mirror' : ''}
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                />
            </div>
        );
    },
);

export default CameraView;
