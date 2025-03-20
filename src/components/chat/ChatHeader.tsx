import { Check, Copy, X } from 'lucide-react';
import { useState } from 'react';
import { DIDDocument } from 'smash-node-lib';

import { logger } from '../../lib/logger';

interface ChatHeaderProps {
    didDocument: DIDDocument;
    profile?: {
        title: string;
        description: string;
        avatar: string;
    } | null;
    onClose?: () => void;
}

export function ChatHeader({ didDocument, profile, onClose }: ChatHeaderProps) {
    const [didCopied, setDidCopied] = useState(false);
    const [copyError, setCopyError] = useState<string | null>(null);

    const handleCopyDID = async () => {
        try {
            logger.debug('Copying DID document');
            setCopyError(null);
            const didDocString = JSON.stringify(didDocument, null, 2);
            await navigator.clipboard.writeText(didDocString);
            setDidCopied(true);
            setTimeout(() => setDidCopied(false), 2000);
            logger.info('DID document copied successfully');
        } catch (err) {
            logger.error('Failed to copy DID document', err);
            setCopyError('Failed to copy DID document');
        }
    };

    return (
        <div className="chat-header">
            <div className="chat-header-content">
                <div className="chat-header-info">
                    <h2 className="chat-header-title">
                        {profile?.title || didDocument.id.slice(0, 16) + '...'}
                    </h2>
                    {profile?.description && (
                        <p className="chat-header-description">
                            {profile.description}
                        </p>
                    )}
                    <div className="chat-header-did">
                        <span
                            className="chat-header-did-text"
                            title={didDocument.id}
                        >
                            {didDocument.id}
                        </span>
                        <button
                            className="did-header-copy-button"
                            onClick={handleCopyDID}
                            title="Copy DID"
                        >
                            {didCopied ? (
                                <Check size={16} />
                            ) : (
                                <Copy size={16} />
                            )}
                        </button>
                    </div>
                </div>
            </div>
            <div className="chat-header-actions">
                {onClose && (
                    <button
                        className="chat-header-close"
                        onClick={onClose}
                        aria-label="Close chat"
                    >
                        <X size={24} />
                    </button>
                )}
            </div>
            {copyError && (
                <div className="status-message error">
                    <span>{copyError}</span>
                </div>
            )}
        </div>
    );
}
