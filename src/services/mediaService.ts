import { type DIDString, IMMediaEmbedded } from 'smash-node-lib';

import { logger } from '../utils/logger';
import { type Media, type MediaType, mediaDB, saveMedia } from './mediaStore';

export interface MediaProcessingOptions {
    quality?: number;
    maxWidth?: number;
    maxHeight?: number;
    format?: 'jpeg' | 'png' | 'webp';
}

export interface MediaShareTarget {
    conversationId: string;
    recipientId: string;
}

export interface ProcessedMedia {
    id: string;
    type: MediaType;
    blob: Blob;
    mediaMessage: IMMediaEmbedded;
    preview?: string; // Object URL for preview
}

class MediaService {
    private static instance: MediaService;
    private previewUrls = new Map<string, string>();

    private constructor() {}

    static getInstance(): MediaService {
        if (!MediaService.instance) {
            MediaService.instance = new MediaService();
        }
        return MediaService.instance;
    }

    /**
     * Process a file/blob into media message format
     */
    async processMedia(
        file: File | Blob,
        options: MediaProcessingOptions = {},
    ): Promise<ProcessedMedia> {
        try {
            let processedBlob = file;
            const type = this.getMediaType(file.type);

            // Apply processing options for images
            if (
                type === 'image' &&
                (options.quality || options.maxWidth || options.maxHeight)
            ) {
                processedBlob = await this.processImage(file, options);
            }

            // Create media message
            const mediaMessage = await IMMediaEmbedded.fromFile(processedBlob);

            // Generate unique ID
            const id = `media_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            // Create preview URL
            const preview = URL.createObjectURL(processedBlob);
            this.previewUrls.set(id, preview);

            return {
                id,
                type,
                blob: processedBlob,
                mediaMessage,
                preview,
            };
        } catch (err) {
            logger.error('Failed to process media', { error: err });
            throw new Error('Failed to process media file');
        }
    }

    /**
     * Process multiple media files
     */
    async processMultipleMedia(
        files: (File | Blob)[],
        options: MediaProcessingOptions = {},
    ): Promise<ProcessedMedia[]> {
        const results = await Promise.allSettled(
            files.map((file) => this.processMedia(file, options)),
        );

        const successful: ProcessedMedia[] = [];
        const failed: string[] = [];

        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                successful.push(result.value);
            } else {
                failed.push(`File ${index + 1}: ${result.reason.message}`);
            }
        });

        if (failed.length > 0) {
            logger.warn('Some media files failed to process', { failed });
        }

        return successful;
    }

    /**
     * Share media to multiple conversations
     */
    async shareMedia(
        media: ProcessedMedia[],
        targets: MediaShareTarget[],
        sendMessageFn: (
            recipientId: DIDString,
            mediaMessage: IMMediaEmbedded,
        ) => Promise<unknown>,
    ): Promise<{ success: number; failed: number; errors: string[] }> {
        let success = 0;
        let failed = 0;
        const errors: string[] = [];

        for (const target of targets) {
            for (const mediaItem of media) {
                try {
                    // Store media locally
                    await this.storeMediaLocally(mediaItem);

                    // Send via provided send function (typically smashOrchestrator.sendMessage)
                    await sendMessageFn(
                        target.recipientId as DIDString,
                        mediaItem.mediaMessage,
                    );

                    success++;
                } catch (err) {
                    logger.error('Failed to share media', {
                        error: err,
                        target,
                        mediaId: mediaItem.id,
                    });
                    errors.push(
                        `Failed to send to ${target.conversationId}: ${err instanceof Error ? err.message : 'Unknown error'}`,
                    );
                    failed++;
                }
            }
        }

        return { success, failed, errors };
    }

    /**
     * Store media locally in IndexedDB
     */
    async storeMediaLocally(media: ProcessedMedia): Promise<number> {
        const mediaEntry: Omit<Media, 'id'> = {
            type: media.type,
            blob: media.blob,
            timestamp: Date.now(),
            isPending: false,
        };

        return await saveMedia(mediaEntry);
    }

    /**
     * Get all stored media
     */
    async getStoredMedia(type?: MediaType, limit?: number): Promise<Media[]> {
        try {
            if (type) {
                const query = mediaDB.media
                    .where('type')
                    .equals(type)
                    .reverse();
                return limit
                    ? await query.limit(limit).toArray()
                    : await query.toArray();
            } else {
                const query = mediaDB.media.orderBy('timestamp').reverse();
                return limit
                    ? await query.limit(limit).toArray()
                    : await query.toArray();
            }
        } catch (err) {
            logger.error('Failed to get stored media', { error: err });
            return [];
        }
    }

    /**
     * Create object URL for media and track it for cleanup
     */
    createPreviewUrl(blob: Blob, id?: string): string {
        const url = URL.createObjectURL(blob);
        if (id) {
            this.previewUrls.set(id, url);
        }
        return url;
    }

    /**
     * Clean up preview URL
     */
    revokePreviewUrl(id: string): void {
        const url = this.previewUrls.get(id);
        if (url) {
            URL.revokeObjectURL(url);
            this.previewUrls.delete(id);
        }
    }

    /**
     * Clean up all preview URLs
     */
    revokeAllPreviewUrls(): void {
        this.previewUrls.forEach((url) => {
            URL.revokeObjectURL(url);
        });
        this.previewUrls.clear();
    }

    /**
     * Get media type from MIME type
     */
    private getMediaType(mimeType: string): MediaType {
        if (mimeType.startsWith('image/')) return 'image';
        if (mimeType.startsWith('video/')) return 'video';
        if (mimeType.startsWith('audio/')) return 'audio';
        throw new Error(`Unsupported media type: ${mimeType}`);
    }

    /**
     * Process image with compression and resizing
     */
    private async processImage(
        file: File | Blob,
        options: MediaProcessingOptions,
    ): Promise<Blob> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                reject(new Error('Failed to get canvas context'));
                return;
            }

            img.onload = () => {
                try {
                    let { width, height } = img;
                    const {
                        maxWidth = 1920,
                        maxHeight = 1080,
                        quality = 0.92,
                        format = 'jpeg',
                    } = options;

                    // Calculate new dimensions
                    if (width > maxWidth || height > maxHeight) {
                        const ratio = Math.min(
                            maxWidth / width,
                            maxHeight / height,
                        );
                        width = Math.round(width * ratio);
                        height = Math.round(height * ratio);
                    }

                    canvas.width = width;
                    canvas.height = height;

                    // Draw and compress
                    ctx.drawImage(img, 0, 0, width, height);

                    canvas.toBlob(
                        (blob) => {
                            if (blob) {
                                resolve(blob);
                            } else {
                                reject(new Error('Failed to compress image'));
                            }
                        },
                        `image/${format}`,
                        quality,
                    );
                } catch (err) {
                    reject(err);
                }
            };

            img.onerror = () => {
                reject(new Error('Failed to load image'));
            };

            img.src = URL.createObjectURL(file);
        });
    }

    /**
     * Validate media file
     */
    validateMedia(
        file: File,
        maxSize = 50 * 1024 * 1024,
    ): { valid: boolean; error?: string } {
        // Check file size
        if (file.size > maxSize) {
            return {
                valid: false,
                error: `File too large. Maximum size: ${Math.round(maxSize / 1024 / 1024)}MB`,
            };
        }

        // Check file type
        try {
            this.getMediaType(file.type);
            return { valid: true };
        } catch {
            return {
                valid: false,
                error: `Unsupported file type: ${file.type}`,
            };
        }
    }

    /**
     * Cleanup resources
     */
    cleanup(): void {
        this.revokeAllPreviewUrls();
    }
}

export const mediaService = MediaService.getInstance();
