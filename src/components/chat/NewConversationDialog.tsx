import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useState } from 'react';
import { DIDDocument } from 'smash-node-lib';

interface NewConversationDialogProps {
    onCreateConversation: (didDoc: DIDDocument) => void;
}

export function NewConversationDialog({
    onCreateConversation,
}: NewConversationDialogProps) {
    const [didInput, setDidInput] = useState('');
    const [error, setError] = useState<string>();

    const handleSubmit = () => {
        console.log(
            '🔄 NewConversationDialog: Starting conversation creation...',
        );
        console.log('📝 Input DID document:', didInput);

        try {
            const didDoc = JSON.parse(didInput) as DIDDocument;
            console.log('✅ DID document parsed successfully:', {
                id: didDoc.id,
                hasIK: !!didDoc.ik,
                hasEK: !!didDoc.ek,
                hasEndpoints: !!didDoc.endpoints,
            });

            // Basic validation of DID document
            if (!didDoc.id || !didDoc.ik || !didDoc.ek || !didDoc.endpoints) {
                console.error(
                    '❌ DID document validation failed: Missing required fields',
                );
                throw new Error(
                    'Invalid DID document: missing required fields',
                );
            }

            console.log(
                '🚀 Calling onCreateConversation with validated DID document',
            );
            onCreateConversation(didDoc);
            setDidInput('');
            setError(undefined);
            console.log('✨ Dialog state reset successfully');
        } catch (err) {
            console.error('❌ Error in conversation creation:', err);
            setError(
                err instanceof Error ? err.message : 'Invalid JSON format',
            );
        }
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
                    <Dialog.Title className="dialog-title">
                        Start New Conversation
                    </Dialog.Title>
                    <Dialog.Description className="dialog-description">
                        Enter the DID document of the peer you want to chat
                        with.
                    </Dialog.Description>

                    <textarea
                        className="dialog-input"
                        value={didInput}
                        onChange={(e) => {
                            console.log(
                                '📝 DID input changed, length:',
                                e.target.value.length,
                            );
                            setDidInput(e.target.value);
                        }}
                        placeholder="Paste DID document JSON here..."
                        rows={10}
                    />

                    {error && <p className="dialog-error">{error}</p>}

                    <div className="dialog-footer">
                        <Dialog.Close asChild>
                            <button className="dialog-button secondary">
                                Cancel
                            </button>
                        </Dialog.Close>
                        <Dialog.Close asChild>
                            <button
                                className="dialog-button primary"
                                onClick={handleSubmit}
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
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
