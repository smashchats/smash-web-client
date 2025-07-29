import { Paperclip } from 'lucide-react';
import { useCallback, useState } from 'react';
import { IMMediaEmbedded } from 'smash-node-lib';

interface MediaUploadProps {
    onMediaSelect: (message: IMMediaEmbedded) => void;
    disabled?: boolean;
}

export function MediaUpload({
    onMediaSelect,
    disabled = false,
}: Readonly<MediaUploadProps>) {
    const [isProcessing, setIsProcessing] = useState(false);

    const handleFileSelect = useCallback(
        async (e: React.ChangeEvent<HTMLInputElement>) => {
            setIsProcessing(true);
            try {
                const files = Array.from(e.target.files || []);
                for (const file of files) {
                    const message = await IMMediaEmbedded.fromFile(file);
                    onMediaSelect(message);
                }
            } finally {
                setIsProcessing(false);
            }
        },
        [onMediaSelect],
    );

    return (
        <div className={`media-upload ${disabled ? 'disabled' : ''}`}>
            <input
                type="file"
                accept="*/*"
                onChange={handleFileSelect}
                disabled={disabled || isProcessing}
                className="hidden"
                id="media-upload"
            />
            <label htmlFor="media-upload" className="media-upload-label">
                {isProcessing ? (
                    <div className="media-upload-spinner">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <circle
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="2"
                                opacity="0.25"
                            />
                            <path
                                fill="currentColor"
                                opacity="0.75"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                        </svg>
                    </div>
                ) : (
                    <Paperclip size={20} />
                )}
            </label>
        </div>
    );
}
