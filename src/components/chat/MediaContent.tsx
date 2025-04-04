import { Download, File } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { IMMediaEmbedded } from 'smash-node-lib';

import { logger } from '../../lib/logger';

interface MediaContentProps {
    data: IMMediaEmbedded['data'];
}

// Supported MIME types by category
const SUPPORTED_MIME_TYPES = {
    image: [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/svg+xml',
        'image/bmp',
        'image/tiff',
        'image/x-icon',
    ],
    video: [
        'video/mp4',
        'video/webm',
        'video/ogg',
        'video/quicktime',
        'video/x-msvideo',
        'video/x-matroska',
    ],
    audio: [
        'audio/mpeg',
        'audio/ogg',
        'audio/wav',
        'audio/webm',
        'audio/aac',
        'audio/midi',
    ],
} as const;

// Helper to check if a MIME type is supported by the browser
const isMimeTypeSupported = (mimeType: string): boolean => {
    if (typeof window === 'undefined') return false;
    return window.MediaSource?.isTypeSupported(mimeType) ?? false;
};

// Helper to get media category from MIME type
const getMediaCategory = (
    mimeType: string,
): 'image' | 'video' | 'audio' | 'other' => {
    if (
        SUPPORTED_MIME_TYPES.image.includes(
            mimeType as (typeof SUPPORTED_MIME_TYPES.image)[number],
        )
    )
        return 'image';
    if (
        SUPPORTED_MIME_TYPES.video.includes(
            mimeType as (typeof SUPPORTED_MIME_TYPES.video)[number],
        )
    )
        return 'video';
    if (
        SUPPORTED_MIME_TYPES.audio.includes(
            mimeType as (typeof SUPPORTED_MIME_TYPES.audio)[number],
        )
    )
        return 'audio';
    return 'other';
};

// Helper to get file extension from MIME type
const getFileExtension = (mimeType: string): string => {
    const category = getMediaCategory(mimeType);
    switch (category) {
        case 'image':
            return mimeType.split('/')[1];
        case 'video':
            return mimeType.split('/')[1];
        case 'audio':
            return mimeType.split('/')[1];
        default:
            return 'bin';
    }
};

export function MediaContent({ data }: MediaContentProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [mediaUrl, setMediaUrl] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
        const handleMedia = async () => {
            try {
                setIsLoading(true);
                setError(null);

                // Create data URL for the media content
                const url = `data:${data.mimeType};base64,${data.content}`;
                setMediaUrl(url);

                // Check if the MIME type is supported
                const category = getMediaCategory(data.mimeType);
                if (category === 'other') {
                    setError('Unsupported media type');
                    setIsLoading(false);
                    return;
                }

                // For video and audio, check browser support
                if (
                    (category === 'video' || category === 'audio') &&
                    !isMimeTypeSupported(data.mimeType)
                ) {
                    setError('Media format not supported by your browser');
                    setIsLoading(false);
                    return;
                }

                setIsLoading(false);
            } catch (err) {
                logger.error('Failed to process media', { error: err });
                setError('Failed to process media');
                setIsLoading(false);
            }
        };

        void handleMedia();
    }, [data]);

    const handleMediaClick = () => {
        if (!error) {
            setShowModal(true);
        }
    };

    const handleCloseModal = () => {
        setShowModal(false);
    };

    const handleDownload = () => {
        if (!mediaUrl) return;

        const extension = getFileExtension(data.mimeType);
        const filename = `download.${extension}`;
        const link = document.createElement('a');
        link.href = mediaUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const renderMediaContent = () => {
        if (isLoading) {
            return (
                <div className="media-loading">
                    <File className="w-6 h-6" />
                </div>
            );
        }

        if (error) {
            return (
                <div className="media-error">
                    <span>{error}</span>
                </div>
            );
        }

        const category = getMediaCategory(data.mimeType);
        switch (category) {
            case 'image':
                return (
                    <img
                        src={mediaUrl!}
                        alt={data.alt || 'Shared image'}
                        className="media-image"
                        onLoad={() => setIsLoading(false)}
                        onError={() => {
                            setIsLoading(false);
                            setError('Failed to load image');
                        }}
                        onClick={handleMediaClick}
                        style={{
                            aspectRatio: data.aspectRatio
                                ? `${data.aspectRatio.width} / ${data.aspectRatio.height}`
                                : 'auto',
                        }}
                    />
                );
            case 'video':
                return (
                    <video
                        ref={videoRef}
                        src={mediaUrl!}
                        controls
                        className="media-video"
                        onLoadedData={() => setIsLoading(false)}
                        onError={() => {
                            setIsLoading(false);
                            setError('Failed to load video');
                        }}
                        style={{
                            aspectRatio: data.aspectRatio
                                ? `${data.aspectRatio.width} / ${data.aspectRatio.height}`
                                : 'auto',
                        }}
                    />
                );
            case 'audio':
                return (
                    <audio
                        ref={audioRef}
                        src={mediaUrl!}
                        controls
                        className="media-audio"
                        onLoadedData={() => setIsLoading(false)}
                        onError={() => {
                            setIsLoading(false);
                            setError('Failed to load audio');
                        }}
                    />
                );
            default:
                return (
                    <div className="media-unsupported">
                        <File className="w-6 h-6" />
                        <span>Unsupported media type</span>
                    </div>
                );
        }
    };

    return (
        <div className="media-content">
            {renderMediaContent()}
            <button className="media-download" onClick={handleDownload}>
                <Download className="w-4 h-4" />
            </button>
            {showModal && mediaUrl && (
                <div className="media-modal" onClick={handleCloseModal}>
                    {getMediaCategory(data.mimeType) === 'image' && (
                        <img
                            src={mediaUrl}
                            alt={data.alt || 'Shared image'}
                            onClick={(e) => e.stopPropagation()}
                        />
                    )}
                    {getMediaCategory(data.mimeType) === 'video' && (
                        <video
                            src={mediaUrl}
                            controls
                            onClick={(e) => e.stopPropagation()}
                        />
                    )}
                    {/* <button
                        className="media-modal-close"
                        onClick={handleCloseModal}
                    >
                        ×
                    </button> */}
                </div>
            )}
        </div>
    );
}
