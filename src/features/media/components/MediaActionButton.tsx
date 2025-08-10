import { type ProcessedMedia, mediaService } from '@services/mediaService';
import { Camera, FileImage, Plus, X } from 'lucide-react';
import { useCallback, useState } from 'react';
import { IMMediaEmbedded } from 'smash-node-lib';

import { CameraCapture } from './CameraCapture';
import { GalleryPicker } from './GalleryPicker';
import './MediaActionButton.css';
import { MediaPreview } from './MediaPreview';
import { SendToConversationDialog } from './SendToConversationDialog';
import { VoiceRecorder } from './VoiceRecorder';

interface MediaActionButtonProps {
    onMediaSend?: (media: IMMediaEmbedded[]) => void;
    onMultipleConversationSend?: (
        media: IMMediaEmbedded[],
        conversationIds: string[],
    ) => void;
    disabled?: boolean;
    size?: 'sm' | 'md' | 'lg';
    showCameraOption?: boolean;
    showGalleryOption?: boolean;
    showVoiceOption?: boolean;
    allowMultipleRecipients?: boolean;
}

type MediaFlow =
    | 'none'
    | 'menu'
    | 'camera'
    | 'gallery'
    | 'voice'
    | 'preview'
    | 'send-dialog';

export function MediaActionButton({
    onMediaSend,
    onMultipleConversationSend,
    disabled = false,
    size = 'md',
    showCameraOption = true,
    showGalleryOption = true,
    showVoiceOption = true,
    allowMultipleRecipients = false,
}: Readonly<MediaActionButtonProps>) {
    const [currentFlow, setCurrentFlow] = useState<MediaFlow>('none');
    const [processedMedia, setProcessedMedia] = useState<ProcessedMedia[]>([]);

    const handleOpenMenu = useCallback(() => {
        if (disabled) return;
        setCurrentFlow('menu');
    }, [disabled]);

    const handleCloseFlow = useCallback(() => {
        setCurrentFlow('none');
        // Clean up any processed media
        processedMedia.forEach((media) => {
            if (media.preview) {
                mediaService.revokePreviewUrl(media.id);
            }
        });
        setProcessedMedia([]);
    }, [processedMedia]);

    const handleCameraCapture = useCallback(async (media: ProcessedMedia) => {
        setProcessedMedia([media]);
        setCurrentFlow('preview');
    }, []);

    const handleGallerySelect = useCallback(
        async (mediaMessages: IMMediaEmbedded[]) => {
            try {
                // Convert IMMediaEmbedded to ProcessedMedia format
                const processed: ProcessedMedia[] = [];

                for (const mediaMessage of mediaMessages) {
                    // Create blob from base64 data
                    const byteCharacters = atob(mediaMessage.data.content);
                    const byteNumbers = new Array(byteCharacters.length);
                    for (let i = 0; i < byteCharacters.length; i++) {
                        byteNumbers[i] = byteCharacters.charCodeAt(i);
                    }
                    const byteArray = new Uint8Array(byteNumbers);
                    const blob = new Blob([byteArray], {
                        type: mediaMessage.data.mimeType,
                    });

                    const processedItem: ProcessedMedia = {
                        id: `gallery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        type: mediaMessage.data.mimeType.startsWith('image/')
                            ? 'image'
                            : mediaMessage.data.mimeType.startsWith('video/')
                              ? 'video'
                              : 'audio',
                        blob,
                        mediaMessage,
                        preview: URL.createObjectURL(blob),
                    };
                    processed.push(processedItem);
                }

                setProcessedMedia(processed);
                setCurrentFlow('preview');
            } catch (err) {
                console.error('Failed to process gallery media:', err);
            }
        },
        [],
    );

    const handleVoiceRecord = useCallback(
        async (mediaMessage: IMMediaEmbedded) => {
            try {
                // Convert IMMediaEmbedded to ProcessedMedia format
                const byteCharacters = atob(mediaMessage.data.content);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], {
                    type: mediaMessage.data.mimeType,
                });

                const processedItem: ProcessedMedia = {
                    id: `voice_${Date.now()}`,
                    type: 'audio',
                    blob,
                    mediaMessage,
                    preview: URL.createObjectURL(blob),
                };

                setProcessedMedia([processedItem]);
                setCurrentFlow('preview');
            } catch (err) {
                console.error('Failed to process voice recording:', err);
            }
        },
        [],
    );

    const handlePreviewSend = useCallback(
        (media: ProcessedMedia[]) => {
            if (allowMultipleRecipients) {
                setCurrentFlow('send-dialog');
            } else {
                // Send directly
                const mediaMessages = media.map((m) => m.mediaMessage);
                onMediaSend?.(mediaMessages);
                handleCloseFlow();
            }
        },
        [allowMultipleRecipients, onMediaSend, handleCloseFlow],
    );

    const handleMultipleConversationSend = useCallback(
        async (targets: { conversationId: string }[]) => {
            try {
                const mediaMessages = processedMedia.map((m) => m.mediaMessage);
                const conversationIds = targets.map((t) => t.conversationId);
                onMultipleConversationSend?.(mediaMessages, conversationIds);
                handleCloseFlow();
            } catch (err) {
                console.error('Failed to send to multiple conversations:', err);
            }
        },
        [processedMedia, onMultipleConversationSend, handleCloseFlow],
    );

    const handleRemoveMedia = useCallback((mediaId: string) => {
        setProcessedMedia((prev) => {
            const removed = prev.find((m) => m.id === mediaId);
            if (removed?.preview) {
                mediaService.revokePreviewUrl(mediaId);
            }
            return prev.filter((m) => m.id !== mediaId);
        });
    }, []);

    const buttonClasses = [
        'media-action-button',
        `media-action-button--${size}`,
        disabled ? 'media-action-button--disabled' : '',
        currentFlow === 'menu' ? 'media-action-button--active' : '',
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <div className="media-action-container">
            {/* Main action button */}
            <button
                className={buttonClasses}
                onClick={handleOpenMenu}
                disabled={disabled}
                aria-label="Media options"
            >
                {currentFlow === 'menu' ? (
                    <X className="media-action-icon" />
                ) : (
                    <Plus className="media-action-icon" />
                )}
            </button>

            {/* Action menu */}
            {currentFlow === 'menu' && (
                <div className="media-action-menu">
                    {showCameraOption && (
                        <button
                            className="media-action-menu-item"
                            onClick={() => setCurrentFlow('camera')}
                            aria-label="Take photo or video"
                        >
                            <Camera className="w-5 h-5" />
                            <span>Camera</span>
                        </button>
                    )}

                    {showGalleryOption && (
                        <GalleryPicker
                            onMediaSelect={handleGallerySelect}
                            multiple={true}
                            size="sm"
                            variant="button"
                        >
                            <FileImage className="w-5 h-5" />
                            <span>Gallery</span>
                        </GalleryPicker>
                    )}

                    {showVoiceOption && (
                        <div className="media-action-menu-item">
                            <VoiceRecorder
                                onRecordingComplete={handleVoiceRecord}
                                variant="button"
                                size="sm"
                            />
                            <span>Voice</span>
                        </div>
                    )}
                </div>
            )}

            {/* Camera capture */}
            <CameraCapture
                isOpen={currentFlow === 'camera'}
                onCapture={handleCameraCapture}
                onClose={() => setCurrentFlow('menu')}
                mode="photo"
            />

            {/* Media preview */}
            <MediaPreview
                isOpen={currentFlow === 'preview'}
                media={processedMedia}
                onSend={handlePreviewSend}
                onRemove={handleRemoveMedia}
                onClose={handleCloseFlow}
            />

            {/* Send to conversations dialog */}
            <SendToConversationDialog
                isOpen={currentFlow === 'send-dialog'}
                media={processedMedia}
                onSend={handleMultipleConversationSend}
                onClose={handleCloseFlow}
            />

            {/* Backdrop */}
            {currentFlow === 'menu' && (
                <div
                    className="media-action-backdrop"
                    onClick={handleCloseFlow}
                />
            )}
        </div>
    );
}
