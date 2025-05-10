import * as Dialog from '@radix-ui/react-dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Camera, Lock, MessageCircle, Shield } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import Button from '../../components/Button';
import { generateIdentity } from '../../lib/smash/smash-init';
import { DEFAULT_SME_CONFIG } from '../../lib/smeConfig';
import { useSmash } from '../../providers/SmashContext';
import './WelcomeGuide.css';

export function WelcomeGuide() {
    const [step, setStep] = useState<1 | 2>(1);
    const [displayName, setDisplayName] = useState('');
    const [generationError, setGenerationError] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const navigate = useNavigate();
    const { setIdentity, error: identityError } = useSmash();
    const { t } = useTranslation('welcome');

    const FEATURES = [
        {
            icon: <Lock />,
            title: t('features.end-to-end-encrypted.title'),
            desc: t('features.end-to-end-encrypted.desc'),
        },
        {
            icon: <Shield />,
            title: t('features.private-by-design.title'),
            desc: t('features.private-by-design.desc'),
        },
        {
            icon: <MessageCircle />,
            title: t('features.decentralized.title'),
            desc: t('features.decentralized.desc'),
        },
        {
            icon: <Camera />,
            title: t('features.media-sharing.title'),
            desc: t('features.media-sharing.desc'),
        },
    ];

    const handleNameChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            setDisplayName(e.target.value);
        },
        [],
    );

    const handleCreateIdentity = useCallback(async () => {
        setIsGenerating(true);
        setGenerationError(null);

        try {
            const identity = await generateIdentity();
            if (!identity) throw new Error('No identity generated');
            await setIdentity(identity, DEFAULT_SME_CONFIG);
            navigate('/chats', { replace: true });
        } catch (error) {
            setGenerationError(
                error instanceof Error
                    ? error.message
                    : t('create-identity.generation-failed'),
            );
            console.error('Failed to create identity', error);
        } finally {
            setIsGenerating(false);
        }
    }, [setIdentity, navigate, t]);

    const errorMessage = identityError?.message ?? generationError;

    return (
        <Dialog.Root open modal>
            <Dialog.Portal>
                <Dialog.Overlay className="welcome-overlay" />
                <Dialog.Content className="welcome-content">
                    <VisuallyHidden>
                        <Dialog.Title>Welcome</Dialog.Title>
                    </VisuallyHidden>

                    {step === 1 && (
                        <>
                            <h2>{t('title')}</h2>
                            <p className="description">{t('description')}</p>

                            <div className="features">
                                {FEATURES.map((feature) => (
                                    <Feature
                                        key={feature.title}
                                        icon={feature.icon}
                                        title={feature.title}
                                        desc={feature.desc}
                                    />
                                ))}
                            </div>

                            <Button
                                className="full"
                                variant="primary"
                                onClick={() => setStep(2)}
                            >
                                {t('continue')}
                            </Button>
                        </>
                    )}

                    {step === 2 && (
                        <>
                            <h2>{t('create-identity.title')}</h2>
                            <p className="description">
                                {t('create-identity.description')}
                            </p>

                            <p className="description">
                                {t('create-identity.display-name')}
                            </p>

                            <input
                                type="text"
                                className="welcome-guide-input-field"
                                placeholder={t('create-identity.placeholder')}
                                value={displayName}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleCreateIdentity();
                                    }
                                }}
                                onChange={handleNameChange}
                                disabled={isGenerating}
                            />

                            {errorMessage && (
                                <p className="welcome-guide-alert-error">
                                    {errorMessage}
                                </p>
                            )}

                            <Button
                                className="full"
                                variant="primary"
                                onClick={handleCreateIdentity}
                                disabled={isGenerating}
                            >
                                {isGenerating
                                    ? t('create-identity.creating')
                                    : t('create-identity.create-identity')}
                            </Button>
                        </>
                    )}
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}

function Feature({
    icon,
    title,
    desc,
}: Readonly<{
    icon: React.ReactNode;
    title: string;
    desc: string;
}>) {
    return (
        <div className="feature">
            <div className="feature-icon">{icon}</div>
            <div className="feature-content">
                <h3>{title}</h3>
                <p>{desc}</p>
            </div>
        </div>
    );
}

export default WelcomeGuide;
