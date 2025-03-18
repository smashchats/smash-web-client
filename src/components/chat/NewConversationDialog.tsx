import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useState } from 'react';
import { DIDDocument } from 'smash-node-lib';

import { logger } from '../../lib/logger';

interface NewConversationDialogProps {
    onCreateConversation: (didDoc: DIDDocument) => void;
}

interface DialogContentProps {
    didInput: string;
    onDidInputChange: (value: string) => void;
    error?: string;
    onSubmit: () => void;
}

function DialogContent({
    didInput,
    onDidInputChange,
    error,
    onSubmit,
}: DialogContentProps) {
    return (
        <>
            <Dialog.Title className="dialog-title">
                Start New Conversation
            </Dialog.Title>
            <Dialog.Description className="dialog-description">
                Enter the DID document of the peer you want to chat with.
            </Dialog.Description>

            <textarea
                className="dialog-input"
                value={didInput}
                onChange={(e) => onDidInputChange(e.target.value)}
                placeholder="Paste DID document JSON here..."
                rows={10}
            />

            {error && <p className="dialog-error">{error}</p>}

            <div className="dialog-footer">
                <Dialog.Close asChild>
                    <button className="dialog-button secondary">Cancel</button>
                </Dialog.Close>
                <Dialog.Close asChild>
                    <button
                        className="dialog-button primary"
                        onClick={onSubmit}
                        disabled={!didInput.trim()}
                    >
                        Create Conversation
                    </button>
                </Dialog.Close>
            </div>

            <Dialog.Close asChild>
                <button className="dialog-close" aria-label="Close">
                    <X size={16} />
                </button>
            </Dialog.Close>
        </>
    );
}

export function NewConversationDialog({
    onCreateConversation,
}: NewConversationDialogProps) {
    const [didInput, setDidInput] = useState('');
    const [error, setError] = useState<string>();

    const validateDIDDocument = (didDoc: DIDDocument): void => {
        if (!didDoc.id || !didDoc.ik || !didDoc.ek || !didDoc.endpoints) {
            logger.warn('Invalid DID document: missing required fields', {
                hasId: !!didDoc.id,
                hasIK: !!didDoc.ik,
                hasEK: !!didDoc.ek,
                hasEndpoints: !!didDoc.endpoints,
            });
            throw new Error('Invalid DID document: missing required fields');
        }
    };

    const handleSubmit = () => {
        logger.debug('Starting conversation creation', {
            inputLength: didInput.length,
        });

        try {
            const didDoc = JSON.parse(didInput) as DIDDocument;
            logger.debug('DID document parsed successfully', {
                didId: didDoc.id,
                hasIK: !!didDoc.ik,
                hasEK: !!didDoc.ek,
                hasEndpoints: !!didDoc.endpoints,
            });

            validateDIDDocument(didDoc);

            logger.info('Creating new conversation', { didId: didDoc.id });
            onCreateConversation(didDoc);
            setDidInput('');
            setError(undefined);
            logger.debug('Dialog state reset successfully');
        } catch (err) {
            logger.error('Error in conversation creation', err);
            setError(
                err instanceof Error ? err.message : 'Invalid JSON format',
            );
        }
    };

    const handleDidInputChange = (value: string) => {
        logger.debug('DID input changed', { length: value.length });
        setDidInput(value);
    };

    return (
        <Dialog.Root>
            <Dialog.Trigger asChild>
                <button className="new-conversation-button">
                    New Conversation
                </button>
            </Dialog.Trigger>
            <Dialog.Portal>
                <Dialog.Overlay className="dialog-overlay" />
                <Dialog.Content className="dialog-content">
                    <DialogContent
                        didInput={didInput}
                        onDidInputChange={handleDidInputChange}
                        error={error}
                        onSubmit={handleSubmit}
                    />
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
