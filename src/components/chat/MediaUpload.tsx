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
}: MediaUploadProps) {
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
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                    <Paperclip className="w-5 h-5" />
                )}
            </label>
        </div>
    );
}
