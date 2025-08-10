import { useCallback, useState } from 'react';
import { IMMediaEmbedded } from 'smash-node-lib';

import { logger } from '../../../utils/logger';

export interface GalleryPickerState {
    isProcessing: boolean;
    error: string | null;
    supportedFormats: string[];
}

export interface PickerOptions {
    multiple?: boolean;
    accept?: string;
    maxSize?: number; // in bytes
    maxFiles?: number;
}

export interface UseGalleryPickerResult {
    state: GalleryPickerState;
    pickFiles: (options?: PickerOptions) => Promise<File[]>;
    pickAndConvertMedia: (
        options?: PickerOptions,
    ) => Promise<IMMediaEmbedded[]>;
    validateFile: (
        file: File,
        options?: PickerOptions,
    ) => { valid: boolean; error?: string };
    getSupportedFormats: () => string[];
}

const DEFAULT_SUPPORTED_FORMATS = [
    // Images
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'image/bmp',
    'image/tiff',
    // Videos
    'video/mp4',
    'video/webm',
    'video/ogg',
    'video/quicktime',
    'video/x-msvideo',
    'video/x-matroska',
    // Audio
    'audio/mpeg',
    'audio/ogg',
    'audio/wav',
    'audio/webm',
    'audio/aac',
    'audio/mp4',
];

const DEFAULT_MAX_SIZE = 50 * 1024 * 1024; // 50MB
const DEFAULT_MAX_FILES = 10;

export function useGalleryPicker(): UseGalleryPickerResult {
    const [state, setState] = useState<GalleryPickerState>({
        isProcessing: false,
        error: null,
        supportedFormats: DEFAULT_SUPPORTED_FORMATS,
    });

    const getSupportedFormats = useCallback((): string[] => {
        return DEFAULT_SUPPORTED_FORMATS;
    }, []);

    const validateFile = useCallback(
        (
            file: File,
            options: PickerOptions = {},
        ): { valid: boolean; error?: string } => {
            const { maxSize = DEFAULT_MAX_SIZE } = options;
            const supportedFormats = getSupportedFormats();

            // Check file size
            if (file.size > maxSize) {
                return {
                    valid: false,
                    error: `File size too large. Maximum: ${Math.round(maxSize / 1024 / 1024)}MB`,
                };
            }

            // Check file type
            if (!supportedFormats.includes(file.type)) {
                return {
                    valid: false,
                    error: `Unsupported file type: ${file.type}`,
                };
            }

            return { valid: true };
        },
        [getSupportedFormats],
    );

    const pickFiles = useCallback(
        async (options: PickerOptions = {}): Promise<File[]> => {
            const {
                multiple = false,
                accept = 'image/*,video/*,audio/*',
                maxFiles = DEFAULT_MAX_FILES,
            } = options;

            setState((prev) => ({ ...prev, isProcessing: true, error: null }));

            try {
                return new Promise((resolve, reject) => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = accept;
                    input.multiple = multiple;

                    input.onchange = (event) => {
                        const target = event.target as HTMLInputElement;
                        const files = Array.from(target.files || []);

                        // Validate file count
                        if (files.length > maxFiles) {
                            reject(
                                new Error(
                                    `Too many files. Maximum: ${maxFiles}`,
                                ),
                            );
                            return;
                        }

                        // Validate each file
                        const invalidFiles = files
                            .map((file) => ({
                                file,
                                validation: validateFile(file, options),
                            }))
                            .filter((item) => !item.validation.valid);

                        if (invalidFiles.length > 0) {
                            const errorMessages = invalidFiles.map(
                                (item) =>
                                    `${item.file.name}: ${item.validation.error}`,
                            );
                            reject(new Error(errorMessages.join(', ')));
                            return;
                        }

                        resolve(files);
                    };

                    input.oncancel = () => {
                        resolve([]);
                    };

                    input.click();
                });
            } catch (err) {
                const errorMessage =
                    err instanceof Error ? err.message : 'Failed to pick files';
                logger.error('Failed to pick files', { error: err });
                setState((prev) => ({
                    ...prev,
                    error: errorMessage,
                }));
                throw err;
            } finally {
                setState((prev) => ({ ...prev, isProcessing: false }));
            }
        },
        [validateFile],
    );

    const pickAndConvertMedia = useCallback(
        async (options: PickerOptions = {}): Promise<IMMediaEmbedded[]> => {
            setState((prev) => ({ ...prev, isProcessing: true, error: null }));

            try {
                const files = await pickFiles(options);

                if (files.length === 0) {
                    return [];
                }

                const mediaPromises = files.map(async (file) => {
                    try {
                        return await IMMediaEmbedded.fromFile(file);
                    } catch (err) {
                        logger.error(`Failed to convert file: ${file.name}`, {
                            error: err,
                        });
                        throw new Error(`Failed to process ${file.name}`);
                    }
                });

                const mediaResults = await Promise.allSettled(mediaPromises);

                const successfulMedia: IMMediaEmbedded[] = [];
                const errors: string[] = [];

                mediaResults.forEach((result, index) => {
                    if (result.status === 'fulfilled') {
                        successfulMedia.push(result.value);
                    } else {
                        errors.push(
                            `${files[index].name}: ${result.reason.message}`,
                        );
                    }
                });

                if (errors.length > 0) {
                    logger.warn('Some files failed to process', { errors });
                    // If all files failed, throw an error
                    if (successfulMedia.length === 0) {
                        throw new Error(
                            `All files failed to process: ${errors.join(', ')}`,
                        );
                    }
                    // If some files failed, set a warning but return successful ones
                    setState((prev) => ({
                        ...prev,
                        error: `Some files failed: ${errors.join(', ')}`,
                    }));
                }

                return successfulMedia;
            } catch (err) {
                const errorMessage =
                    err instanceof Error
                        ? err.message
                        : 'Failed to process media';
                logger.error('Failed to pick and convert media', {
                    error: err,
                });
                setState((prev) => ({
                    ...prev,
                    error: errorMessage,
                }));
                throw err;
            } finally {
                setState((prev) => ({ ...prev, isProcessing: false }));
            }
        },
        [pickFiles],
    );

    return {
        state,
        pickFiles,
        pickAndConvertMedia,
        validateFile,
        getSupportedFormats,
    };
}
