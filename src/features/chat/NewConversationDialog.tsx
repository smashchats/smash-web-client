import * as Dialog from '@radix-ui/react-dialog';
import { MessageCirclePlus, X } from 'lucide-react';
import { useState } from 'react';
import type { DIDDocument } from 'smash-node-lib';

import Button from '../../components/Button';
import { logger } from '../../lib/logger';
import './NewConversationDialog.css';

interface NewConversationDialogProps {
    onCreateConversation: (didDoc: DIDDocument) => void;
    onCancel?: () => void;
}

interface DialogContentProps {
    didInput: string;
    onDidInputChange: (value: string) => void;
    error?: string;
    onSubmit: () => void;
    onCancel: () => void;
}

function DialogContent({
    didInput,
    onDidInputChange,
    error,
    onSubmit,
    onCancel,
}: Readonly<DialogContentProps>) {
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
            />

            {error && <p className="dialog-error">{error}</p>}

            <div className="dialog-footer">
                <Button
                    variant="secondary"
                    onClick={onCancel}
                    className="dialog-button"
                >
                    Cancel
                </Button>
                <Button
                    variant="primary"
                    onClick={onSubmit}
                    disabled={!didInput.trim()}
                    className="dialog-button"
                >
                    Create Conversation
                </Button>
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
    onCancel,
}: Readonly<NewConversationDialogProps>) {
    const [didInput, setDidInput] = useState('');
    const [error, setError] = useState<string>();
    const [open, setOpen] = useState(false);

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
            setOpen(false);
        } catch (err) {
            logger.error('Error in conversation creation', err);
            setError(
                err instanceof Error ? err.message : 'Invalid JSON format',
            );
        }
    };

    const handleDidInputChange = (value: string) => {
        setDidInput(value);
    };

    const handleCancel = () => {
        setDidInput('');
        setError(undefined);
        setOpen(false);
        onCancel?.();
    };

    return (
        <Dialog.Root open={open} onOpenChange={setOpen}>
            <Dialog.Trigger asChild>
                <MessageCirclePlus />
            </Dialog.Trigger>
            <Dialog.Portal>
                <Dialog.Overlay className="dialog-overlay" />
                <Dialog.Content className="dialog-content">
                    <DialogContent
                        didInput={didInput}
                        onDidInputChange={handleDidInputChange}
                        error={error}
                        onSubmit={handleSubmit}
                        onCancel={handleCancel}
                    />
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
