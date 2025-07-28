import * as Dialog from '@radix-ui/react-dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Camera, Lock, MessageCircle, Shield } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { DEFAULT_SME_CONFIG } from '@app/config/sme';
import { useIdentityContext, generateIdentity } from '@features/identity';
import Button from '@shared/components/Button';
import './WelcomeGuide.css';

export function WelcomeGuide() {
    const [step, setStep] = useState<1 | 2>(1);
    const [displayName, setDisplayName] = useState('');
    const [generationError, setGenerationError] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const navigate = useNavigate();
    const { setIdentity, error: identityError } = useIdentityContext();
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
            await setIdentity(identity, DEFAULT_SME_CONFIG, { 
                title: displayName || 'Anonymous User',
                description: 'Smash user',
                avatar: ''
            });
            navigate('/', { replace: true });
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
    }, [setIdentity, displayName, navigate, t]);

    const errorMessage = identityError?.message ?? generationError;

    return (
        <Dialog.Root open modal>
            <Dialog.Portal>
                <Dialog.Overlay className="welcome-overlay" />
                <div className="welcome-content-wrapper">
                    <Dialog.Content className="welcome-content" aria-describedby="welcome-description">
                        <VisuallyHidden>
                            <Dialog.Title>Welcome</Dialog.Title>
                        </VisuallyHidden>
                        <div id="welcome-description" className="sr-only">
                            Welcome to Smashchats - A decentralized, private-first messaging app
                        </div>

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
                                className="btn-primary"
                                isFullWidth
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
                                aria-label={t('create-identity.display-name')}
                                autoComplete="name"
                                autoFocus
                            />

                            {errorMessage && (
                                <p className="welcome-guide-alert-error">
                                    {errorMessage}
                                </p>
                            )}

                            <Button
                                className="btn-primary"
                                isFullWidth
                                onClick={handleCreateIdentity}
                                disabled={isGenerating}
                                isLoading={isGenerating}
                            >
                                {isGenerating
                                    ? t('create-identity.creating')
                                    : t('create-identity.create-identity')}
                            </Button>
                        </>
                    )}
                    </Dialog.Content>
                </div>
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
