import * as Dialog from '@radix-ui/react-dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Database, Lock, Shield, Users } from 'lucide-react';
import { useCallback, useState } from 'react';
import { IMPeerIdentity } from 'smash-node-lib';

import { generateIdentity } from '../lib/smash-init';
import './WelcomeGuide.css';

interface WelcomeGuideProps {
    onCreateIdentity: (identity: IMPeerIdentity) => void;
    isLoading: boolean;
    error: Error | null;
}

export function WelcomeGuide({
    onCreateIdentity,
    isLoading,
    error,
}: WelcomeGuideProps) {
    const [isGenerating, setIsGenerating] = useState(false);
    const [errorState, setErrorState] = useState<string | null>(null);

    const handleGenerateIdentity = useCallback(async () => {
        setIsGenerating(true);
        setErrorState(null);

        try {
            // Generate new identity
            const identity = await generateIdentity();

            if (!identity) {
                throw new Error(
                    'Failed to generate identity - no identity returned',
                );
            }

            // Export identity to JSON for storage
            const exportedIdentity = await identity.serialize();

            if (!exportedIdentity) {
                throw new Error('Failed to serialize identity');
            }

            // Notify parent component
            onCreateIdentity(identity);
        } catch (err) {
            console.error('Failed to generate identity:', err);
            setErrorState(
                err instanceof Error
                    ? err.message
                    : 'Failed to generate your identity. Please try again.',
            );
        } finally {
            setIsGenerating(false);
        }
    }, [onCreateIdentity]);

    return (
        <Dialog.Root open defaultOpen modal>
            <Dialog.Portal>
                <Dialog.Overlay className="DialogOverlay" />
                <Dialog.Content
                    className="DialogContent"
                    onEscapeKeyDown={(e) => e.preventDefault()}
                    onPointerDownOutside={(e) => e.preventDefault()}
                >
                    <VisuallyHidden>
                        <Dialog.Title className="DialogTitle">
                            Welcome to Smash
                        </Dialog.Title>
                    </VisuallyHidden>

                    <Dialog.Description className="DialogDescription">
                        <b>Welcome to Smash</b>, a decentralized messaging
                        protocol that puts you in control of your
                        communications.
                    </Dialog.Description>

                    <div className="DialogFeatureList">
                        <div className="DialogFeatureItem">
                            <Shield className="DialogFeatureIcon" />
                            <div className="DialogFeatureContent">
                                <h4>Privacy First</h4>
                                <p>
                                    Your identity is stored only on your device,
                                    ensuring complete privacy.
                                </p>
                            </div>
                        </div>

                        <div className="DialogFeatureItem">
                            <Lock className="DialogFeatureIcon" />
                            <div className="DialogFeatureContent">
                                <h4>End-to-End Encryption</h4>
                                <p>
                                    All your communications are secure and
                                    encrypted.
                                </p>
                            </div>
                        </div>

                        <div className="DialogFeatureItem">
                            <Users className="DialogFeatureIcon" />
                            <div className="DialogFeatureContent">
                                <h4>Join Communities</h4>
                                <p>
                                    Connect with others in neighborhood
                                    communities.
                                </p>
                            </div>
                        </div>

                        <div className="DialogFeatureItem">
                            <Database className="DialogFeatureIcon" />
                            <div className="DialogFeatureContent">
                                <h4>Data Ownership</h4>
                                <p>Export and backup your data anytime.</p>
                            </div>
                        </div>
                    </div>

                    <div className="button-container">
                        {(error || errorState) && (
                            <div
                                className="mt-8 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"
                                role="alert"
                            >
                                {error?.message || errorState}
                            </div>
                        )}

                        <button
                            className="DialogButton"
                            onClick={handleGenerateIdentity}
                            disabled={isGenerating || isLoading}
                            data-loading={isGenerating || isLoading}
                        >
                            {isGenerating || isLoading
                                ? 'Generating Identity...'
                                : 'Generate My Identity'}
                        </button>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
