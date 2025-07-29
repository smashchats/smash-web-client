import * as Dialog from '@radix-ui/react-dialog';
import Button from '@shared/components/Button';
import { logger } from '@shared/utils/logger';
import { Plus, X } from 'lucide-react';
import { useState } from 'react';
import type { DIDDocument } from 'smash-node-lib';

import './NewConversationDialog.css';

type InputMode = 'text'; // Simplified to only text for now

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
    inputMode: InputMode;
    onInputModeChange: (mode: InputMode) => void;
}

function DialogContent({
    didInput,
    onDidInputChange,
    error,
    onSubmit,
    onCancel,
}: Readonly<DialogContentProps>) {
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && e.ctrlKey && didInput.trim()) {
            onSubmit();
        }
    };

    return (
        <div className="new-chat-dialog">
            <div className="new-chat-header">
                <div className="new-chat-icon">
                    <Plus size={24} />
                </div>
                <div className="new-chat-title-section">
                    <Dialog.Title className="new-chat-title">
                        Start New Chat
                    </Dialog.Title>
                    <Dialog.Description className="new-chat-description">
                        Paste a DID document to start chatting
                    </Dialog.Description>
                </div>
                <Dialog.Close asChild>
                    <button className="new-chat-close" aria-label="Close">
                        <X size={20} />
                    </button>
                </Dialog.Close>
            </div>

            <div className="new-chat-content">
                <div className="did-input-section">
                    <label htmlFor="did-input" className="did-input-label">
                        DID Document
                    </label>
                    <textarea
                        id="did-input"
                        className="did-input"
                        value={didInput}
                        onChange={(e) => onDidInputChange(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Paste the complete DID document JSON here..."
                        rows={8}
                    />
                    {/* <div className="did-input-hint">
                    // TODO: add Ctrl+Enter to create conversation
                        <span>Tip: Press Ctrl+Enter to create conversation</span>
                    </div> */}
                </div>

                {error && (
                    <div className="new-chat-error">
                        <span className="new-chat-error-text">{error}</span>
                    </div>
                )}
            </div>

            <div className="new-chat-footer">
                <Button variant="secondary" onClick={onCancel}>
                    Cancel
                </Button>
                <Button
                    variant="primary"
                    onClick={onSubmit}
                    disabled={!didInput.trim()}
                >
                    Start Chat
                </Button>
            </div>
        </div>
    );
}

export function NewConversationDialog({
    onCreateConversation,
    onCancel,
}: Readonly<NewConversationDialogProps>) {
    const [didInput, setDidInput] = useState('');
    const [error, setError] = useState<string>();
    const [open, setOpen] = useState(false);
    const [inputMode] = useState<InputMode>('text'); // Always text for now

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
            handleReset();
            setOpen(false);
        } catch (err) {
            logger.error('Error in conversation creation', err);
            setError(
                err instanceof Error
                    ? err.message
                    : 'Invalid JSON format. Please check your DID document.',
            );
        }
    };

    const handleReset = () => {
        setDidInput('');
        setError(undefined);
    };

    const handleCancel = () => {
        handleReset();
        setOpen(false);
        onCancel?.();
    };

    return (
        <Dialog.Root open={open} onOpenChange={setOpen}>
            <Dialog.Trigger asChild>
                <button
                    className="chat-list-action-button chat-list-action-button--primary"
                    aria-label="Start new chat"
                >
                    <Plus size={20} />
                </button>
            </Dialog.Trigger>
            <Dialog.Portal>
                <Dialog.Overlay className="new-chat-overlay" />
                <Dialog.Content className="new-chat-content-wrapper">
                    <DialogContent
                        didInput={didInput}
                        onDidInputChange={setDidInput}
                        error={error}
                        onSubmit={handleSubmit}
                        onCancel={handleCancel}
                        inputMode={inputMode}
                        onInputModeChange={() => {}} // No-op since we only have text mode
                    />
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
