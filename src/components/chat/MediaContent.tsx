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
        'audio/mp4',
    ],
} as const;

// Helper to calculate the file size from base64 string
const getFileSizeFromBase64 = (base64Content: string): number => {
    // Base64 string length * 0.75 gives approximate file size in bytes
    const base64Length = base64Content.replace(/=/g, '').length;
    return Math.floor(base64Length * 0.75);
};

// Helper to format file size in human-readable format
const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';

    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));

    return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(2))} ${sizes[i]}`;
};

// Helper to get a more readable MIME type description
const getMimeTypeDescription = (mimeType: string): string => {
    const parts = mimeType.split('/');
    if (parts.length !== 2) return mimeType;

    const [type, subtype] = parts;
    return `${type.charAt(0).toUpperCase() + type.slice(1)} (${subtype})`;
};

// Helper to check if a MIME type is supported by the browser
const isMimeTypeSupported = (mimeType: string): boolean => {
    if (typeof window === 'undefined') return false;

    // For audio, check support regardless of format
    if (mimeType.startsWith('audio/')) {
        const audio = document.createElement('audio');
        const support = audio.canPlayType(mimeType);
        return support === 'probably' || support === 'maybe';
    }

    if (mimeType.startsWith('video/')) {
        const video = document.createElement('video');
        const support = video.canPlayType(mimeType);
        return support === 'probably' || support === 'maybe';
    }

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
    const [fileSize, setFileSize] = useState<number>(0);
    const videoRef = useRef<HTMLVideoElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
        const handleMedia = async () => {
            try {
                setIsLoading(true);
                setError(null);

                // Calculate file size
                const size = getFileSizeFromBase64(data.content);
                setFileSize(size);

                // Create data URL for the media content
                const url = `data:${data.mimeType};base64,${data.content}`;
                setMediaUrl(url);

                // Check if the MIME type is supported
                const category = getMediaCategory(data.mimeType);
                if (category === 'other') {
                    setError('unsupported_type');
                    setIsLoading(false);
                    return;
                }

                // For video and audio, check browser support
                if (
                    (category === 'video' || category === 'audio') &&
                    !isMimeTypeSupported(data.mimeType)
                ) {
                    setError('browser_unsupported');
                    setIsLoading(false);
                    return;
                }

                setIsLoading(false);
            } catch (err) {
                logger.error('Failed to process media', { error: err });
                setError('failed_to_process');
                setIsLoading(false);
            }
        };

        void handleMedia();
    }, [data]);

    const handleMediaClick = () => {
        if (
            !error ||
            error === 'unsupported_type' ||
            error === 'browser_unsupported'
        ) {
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
            if (error === 'unsupported_type') {
                return (
                    <div className="media-unsupported">
                        <File className="w-6 h-6" />
                        <div className="flex flex-col">
                            <span className="font-medium">
                                {getMimeTypeDescription(data.mimeType)}
                            </span>
                            <span className="text-sm text-gray-500">
                                {formatFileSize(fileSize)}
                            </span>
                        </div>
                    </div>
                );
            } else if (error === 'browser_unsupported') {
                return (
                    <div className="media-unsupported">
                        <File className="w-6 h-6" />
                        <div className="flex flex-col">
                            <span>Format not supported by your browser</span>
                            <span className="text-sm text-gray-500">
                                {getMimeTypeDescription(data.mimeType)} •{' '}
                                {formatFileSize(fileSize)}
                            </span>
                        </div>
                    </div>
                );
            } else {
                return (
                    <div className="media-error">
                        <span>
                            {error === 'failed_to_process'
                                ? 'Failed to process media'
                                : error}
                        </span>
                    </div>
                );
            }
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
                        preload="metadata"
                        onLoadedMetadata={() => {
                            setIsLoading(false);
                            // Force duration update by accessing the duration property
                            if (audioRef.current) {
                                const duration = audioRef.current.duration;
                                logger.debug('Audio duration loaded', {
                                    duration,
                                });
                            }
                        }}
                        onDurationChange={() => {
                            if (audioRef.current) {
                                const duration = audioRef.current.duration;
                                logger.debug('Audio duration changed', {
                                    duration,
                                });
                            }
                        }}
                        onError={(e) => {
                            setIsLoading(false);
                            logger.error('Failed to load audio', { error: e });
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
