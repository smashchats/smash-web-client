import { FileImage, FileVideo, Music, Paperclip } from 'lucide-react';
import { useCallback } from 'react';
import { IMMediaEmbedded } from 'smash-node-lib';

import { useGalleryPicker } from '../hooks/useGalleryPicker';
import './GalleryPicker.css';

interface GalleryPickerProps {
    onMediaSelect: (media: IMMediaEmbedded[]) => void;
    disabled?: boolean;
    multiple?: boolean;
    accept?: 'all' | 'image' | 'video' | 'audio';
    maxFiles?: number;
    maxSize?: number; // in MB
    variant?: 'button' | 'dropzone';
    size?: 'sm' | 'md' | 'lg';
    children?: React.ReactNode;
}

const ACCEPT_MAPPING = {
    all: 'image/*,video/*,audio/*',
    image: 'image/*',
    video: 'video/*',
    audio: 'audio/*',
};

const ICON_MAPPING = {
    all: Paperclip,
    image: FileImage,
    video: FileVideo,
    audio: Music,
};

export function GalleryPicker({
    onMediaSelect,
    disabled = false,
    multiple = false,
    accept = 'all',
    maxFiles = 10,
    maxSize = 50, // MB
    variant = 'button',
    size = 'md',
    children,
}: Readonly<GalleryPickerProps>) {
    const { state, pickAndConvertMedia } = useGalleryPicker();

    const handlePick = useCallback(async () => {
        if (disabled || state.isProcessing) return;

        try {
            const media = await pickAndConvertMedia({
                multiple,
                accept: ACCEPT_MAPPING[accept],
                maxFiles,
                maxSize: maxSize * 1024 * 1024, // Convert MB to bytes
            });

            if (media.length > 0) {
                onMediaSelect(media);
            }
        } catch (err) {
            console.error('Failed to pick media:', err);
        }
    }, [
        disabled,
        state.isProcessing,
        pickAndConvertMedia,
        multiple,
        accept,
        maxFiles,
        maxSize,
        onMediaSelect,
    ]);

    const Icon = ICON_MAPPING[accept];

    if (variant === 'dropzone') {
        return (
            <GalleryPickerDropzone
                onPick={handlePick}
                disabled={disabled}
                isProcessing={state.isProcessing}
                error={state.error}
                accept={accept}
                multiple={multiple}
            >
                {children}
            </GalleryPickerDropzone>
        );
    }

    const buttonClasses = [
        'gallery-picker-button',
        `gallery-picker-button--${size}`,
        disabled || state.isProcessing ? 'gallery-picker-button--disabled' : '',
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <div className="gallery-picker">
            <button
                className={buttonClasses}
                onClick={handlePick}
                disabled={disabled || state.isProcessing}
                aria-label={`Select ${accept === 'all' ? 'media' : accept} files`}
            >
                {state.isProcessing ? (
                    <div className="gallery-picker-spinner">
                        <div className="spinner-dot"></div>
                        <div className="spinner-dot"></div>
                        <div className="spinner-dot"></div>
                    </div>
                ) : (
                    <>
                        <Icon className="gallery-picker-icon" />
                        {children && (
                            <span className="gallery-picker-label">
                                {children}
                            </span>
                        )}
                    </>
                )}
            </button>

            {state.error && (
                <div className="gallery-picker-error" role="alert">
                    {state.error}
                </div>
            )}
        </div>
    );
}

interface GalleryPickerDropzoneProps {
    onPick: () => void;
    disabled: boolean;
    isProcessing: boolean;
    error: string | null;
    accept: string;
    multiple: boolean;
    children?: React.ReactNode;
}

function GalleryPickerDropzone({
    onPick,
    disabled,
    isProcessing,
    error,
    accept,
    multiple,
    children,
}: Readonly<GalleryPickerDropzoneProps>) {
    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            e.stopPropagation();

            if (disabled || isProcessing) return;

            // For now, just trigger the file picker
            // In a full implementation, you'd handle the dropped files
            onPick();
        },
        [disabled, isProcessing, onPick],
    );

    const dropzoneClasses = [
        'gallery-picker-dropzone',
        disabled || isProcessing ? 'gallery-picker-dropzone--disabled' : '',
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <div className="gallery-picker-dropzone-container">
            <div
                className={dropzoneClasses}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={onPick}
                role="button"
                tabIndex={disabled ? -1 : 0}
                onKeyDown={(e) => {
                    if (
                        (e.key === 'Enter' || e.key === ' ') &&
                        !disabled &&
                        !isProcessing
                    ) {
                        e.preventDefault();
                        onPick();
                    }
                }}
                aria-label={`Drop or click to select ${accept === 'all' ? 'media' : accept} files`}
            >
                {isProcessing ? (
                    <div className="gallery-picker-dropzone-processing">
                        <div className="gallery-picker-spinner">
                            <div className="spinner-dot"></div>
                            <div className="spinner-dot"></div>
                            <div className="spinner-dot"></div>
                        </div>
                        <span>Processing files...</span>
                    </div>
                ) : (
                    <div className="gallery-picker-dropzone-content">
                        {children || (
                            <>
                                <Paperclip className="gallery-picker-dropzone-icon" />
                                <div className="gallery-picker-dropzone-text">
                                    <span className="gallery-picker-dropzone-primary">
                                        Drop files here or click to browse
                                    </span>
                                    <span className="gallery-picker-dropzone-secondary">
                                        {accept === 'all'
                                            ? 'Images, videos, and audio files'
                                            : `${accept.charAt(0).toUpperCase() + accept.slice(1)} files`}
                                        {multiple &&
                                            ' (multiple files allowed)'}
                                    </span>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            {error && (
                <div className="gallery-picker-error" role="alert">
                    {error}
                </div>
            )}
        </div>
    );
}
