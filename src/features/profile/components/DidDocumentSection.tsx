import { Check, Copy } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useEffect, useState } from 'react';

import Button from '../../../components/Button';
import { logger } from '../../../lib/logger';
import { copyToClipboard } from '../../../lib/utils';
import { useSmash } from '../../../providers/SmashContext';

export function DidDocumentSection() {
    const [didDocumentString, setDidDocumentString] = useState<string | null>(
        null,
    );
    const [isLoadingDID, setIsLoadingDID] = useState(true);
    const [didCopied, setDidCopied] = useState(false);
    const [copyError, setCopyError] = useState<string | null>(null);

    const { smashUser } = useSmash();

    useEffect(() => {
        const loadDIDDocument = async () => {
            if (!smashUser) {
                setIsLoadingDID(false);
                return;
            }

            try {
                setIsLoadingDID(true);
                const doc = await smashUser.getDIDDocument();
                setDidDocumentString(JSON.stringify(doc, null, 2));
            } catch (error) {
                logger.error('Failed to load DID document', error);
                setCopyError('Error loading DID document');
            } finally {
                setIsLoadingDID(false);
            }
        };
        loadDIDDocument();
    }, [smashUser]);

    const handleCopyDID = async () => {
        if (!didDocumentString) {
            setCopyError('DID document not available');
            return;
        }

        try {
            logger.debug('Copying DID document');
            setCopyError(null);

            const result = await copyToClipboard(didDocumentString);
            if (!result.success) {
                throw new Error(
                    result.errorMessage ?? 'Failed to copy to clipboard',
                );
            }

            setDidCopied(true);
            setTimeout(() => setDidCopied(false), 2000);
            logger.info('DID document copied successfully');
        } catch (err) {
            logger.error('Failed to copy DID document', err);
            setCopyError(
                err instanceof Error
                    ? err.message
                    : 'Failed to copy DID document',
            );
        }
    };

    return (
        <div className="settings-section">
            <h2 className="settings-section-title">Your Identity</h2>
            <div className="settings-card">
                <div className="settings-form">
                    <div className="form-group">
                        <label>Your DID Document</label>
                        <div className="did-document-container">
                            {didDocumentString && (
                                <div className="qr-code-container">
                                    <QRCodeSVG
                                        value={didDocumentString}
                                        size={window.innerWidth * 0.9}
                                        level="H"
                                        className="qr-code"
                                    />
                                </div>
                            )}
                            <Button
                                className={`full`}
                                variant={didCopied ? 'success' : 'primary'}
                                onClick={handleCopyDID}
                                disabled={isLoadingDID || !didDocumentString}
                            >
                                {(() => {
                                    if (isLoadingDID) {
                                        return (
                                            <>
                                                <div className="spinner" />
                                                <span>Loading...</span>
                                            </>
                                        );
                                    }
                                    if (didCopied) {
                                        return (
                                            <>
                                                <Check size={16} />
                                                Copied!
                                            </>
                                        );
                                    }
                                    return (
                                        <>
                                            <Copy size={16} />
                                            Copy DID Document
                                        </>
                                    );
                                })()}
                            </Button>
                            {copyError && (
                                <div className="status-message error">
                                    <span>{copyError}</span>
                                </div>
                            )}
                        </div>
                        <p className="did-help-text">
                            Click the button above to copy your DID document to
                            share with peers. The copied document will include
                            your current endpoints configuration.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
