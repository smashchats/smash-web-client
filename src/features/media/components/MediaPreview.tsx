import { type ProcessedMedia } from '@services/mediaService';
import { Download, Edit3, Play, Send, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import './MediaPreview.css';

interface MediaPreviewProps {
    media: ProcessedMedia[];
    onSend: (media: ProcessedMedia[]) => void;
    onEdit?: (media: ProcessedMedia) => void;
    onRemove?: (mediaId: string) => void;
    onClose: () => void;
    isOpen: boolean;
    allowEdit?: boolean;
    maxPreviewHeight?: number;
}

export function MediaPreview({
    media,
    onSend,
    onEdit,
    onRemove,
    onClose,
    isOpen,
    allowEdit = false,
    maxPreviewHeight = 400,
}: Readonly<MediaPreviewProps>) {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Reset selected index when media changes
    useEffect(() => {
        if (media.length === 0) {
            setSelectedIndex(0);
        } else if (selectedIndex >= media.length) {
            setSelectedIndex(Math.max(0, media.length - 1));
        }
    }, [media.length, selectedIndex]);

    const handleSend = useCallback(() => {
        if (media.length > 0) {
            onSend(media);
        }
    }, [media, onSend]);

    const handleDownload = useCallback((mediaItem: ProcessedMedia) => {
        if (!mediaItem.preview) return;

        const link = document.createElement('a');
        link.href = mediaItem.preview;
        link.download = `media_${mediaItem.id}.${getFileExtension(mediaItem.type)}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, []);

    const getFileExtension = (type: ProcessedMedia['type']): string => {
        switch (type) {
            case 'image':
                return 'jpg';
            case 'video':
                return 'mp4';
            case 'audio':
                return 'wav';
            default:
                return 'bin';
        }
    };

    const formatFileSize = (blob: Blob): string => {
        const bytes = blob.size;
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
    };

    if (!isOpen || media.length === 0) return null;

    const currentMedia = media[selectedIndex];

    return (
        <div className="media-preview-overlay">
            <div className="media-preview-container">
                {/* Header */}
                <div className="media-preview-header">
                    <div className="media-preview-title">
                        Preview ({selectedIndex + 1} of {media.length})
                    </div>
                    <button
                        className="media-preview-close"
                        onClick={onClose}
                        aria-label="Close preview"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Main preview area */}
                <div className="media-preview-content">
                    <div
                        className="media-preview-main"
                        style={{ maxHeight: maxPreviewHeight }}
                    >
                        <MediaItem media={currentMedia} />
                    </div>

                    {/* Media info */}
                    <div className="media-preview-info">
                        <div className="media-info-left">
                            <span className="media-type-badge">
                                {currentMedia.type.toUpperCase()}
                            </span>
                            <span className="media-size">
                                {formatFileSize(currentMedia.blob)}
                            </span>
                        </div>

                        <div className="media-info-actions">
                            <button
                                className="media-action-button"
                                onClick={() => handleDownload(currentMedia)}
                                aria-label="Download"
                            >
                                <Download className="w-4 h-4" />
                            </button>

                            {allowEdit && onEdit && (
                                <button
                                    className="media-action-button"
                                    onClick={() => onEdit(currentMedia)}
                                    aria-label="Edit"
                                >
                                    <Edit3 className="w-4 h-4" />
                                </button>
                            )}

                            {media.length > 1 && onRemove && (
                                <button
                                    className="media-action-button media-action-button--danger"
                                    onClick={() => onRemove(currentMedia.id)}
                                    aria-label="Remove"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Thumbnail strip for multiple media */}
                {media.length > 1 && (
                    <div className="media-preview-thumbnails">
                        <div
                            className="media-thumbnails-scroll"
                            ref={scrollContainerRef}
                        >
                            {media.map((mediaItem, index) => (
                                <button
                                    key={mediaItem.id}
                                    className={`media-thumbnail ${
                                        index === selectedIndex
                                            ? 'media-thumbnail--active'
                                            : ''
                                    }`}
                                    onClick={() => setSelectedIndex(index)}
                                    aria-label={`View ${mediaItem.type} ${index + 1}`}
                                >
                                    <MediaThumbnail media={mediaItem} />
                                    {index === selectedIndex && (
                                        <div className="media-thumbnail-indicator" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Action buttons */}
                <div className="media-preview-actions">
                    <button
                        className="btn-secondary btn-size-md"
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                    <button
                        className="btn-primary btn-size-md"
                        onClick={handleSend}
                    >
                        <Send className="w-4 h-4" />
                        Send {media.length > 1 ? `(${media.length})` : ''}
                    </button>
                </div>
            </div>
        </div>
    );
}

interface MediaItemProps {
    media: ProcessedMedia;
}

function MediaItem({ media }: Readonly<MediaItemProps>) {
    const [isPlaying, setIsPlaying] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    const handlePlayToggle = useCallback(() => {
        if (!videoRef.current) return;

        if (isPlaying) {
            videoRef.current.pause();
        } else {
            videoRef.current.play();
        }
        setIsPlaying(!isPlaying);
    }, [isPlaying]);

    switch (media.type) {
        case 'image':
            return (
                <img
                    src={media.preview}
                    alt="Preview"
                    className="media-preview-image"
                />
            );

        case 'video':
            return (
                <div className="media-preview-video-container">
                    <video
                        ref={videoRef}
                        src={media.preview}
                        className="media-preview-video"
                        muted
                        onPlay={() => setIsPlaying(true)}
                        onPause={() => setIsPlaying(false)}
                        onEnded={() => setIsPlaying(false)}
                    />
                    <button
                        className="media-preview-play-button"
                        onClick={handlePlayToggle}
                        aria-label={isPlaying ? 'Pause' : 'Play'}
                    >
                        <Play
                            className={`w-8 h-8 ${isPlaying ? 'opacity-0' : 'opacity-100'}`}
                        />
                    </button>
                </div>
            );

        case 'audio':
            return (
                <div className="media-preview-audio">
                    <audio
                        src={media.preview}
                        controls
                        className="media-preview-audio-player"
                    />
                </div>
            );

        default:
            return (
                <div className="media-preview-unsupported">
                    <span>Unsupported media type</span>
                </div>
            );
    }
}

interface MediaThumbnailProps {
    media: ProcessedMedia;
}

function MediaThumbnail({ media }: Readonly<MediaThumbnailProps>) {
    switch (media.type) {
        case 'image':
            return (
                <img
                    src={media.preview}
                    alt="Thumbnail"
                    className="media-thumbnail-image"
                />
            );

        case 'video':
            return (
                <div className="media-thumbnail-video">
                    <video
                        src={media.preview}
                        className="media-thumbnail-image"
                        muted
                    />
                    <div className="media-thumbnail-overlay">
                        <Play className="w-3 h-3" />
                    </div>
                </div>
            );

        case 'audio':
            return (
                <div className="media-thumbnail-audio">
                    <div className="media-thumbnail-audio-icon">♪</div>
                </div>
            );

        default:
            return (
                <div className="media-thumbnail-unknown">
                    <span>?</span>
                </div>
            );
    }
}
