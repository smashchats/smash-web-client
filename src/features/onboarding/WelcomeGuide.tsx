import * as Dialog from '@radix-ui/react-dialog';
import { ArrowRight, Camera, Lock, MessageCircle, Shield, User } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { DEFAULT_SME_CONFIG } from '@app/config/sme';
import { generateIdentity, useIdentityContext } from '@features/identity';
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
                title: displayName.trim() || '',
                description: '',
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
                        <div id="welcome-description" className="sr-only">
                            Welcome to Smashchats - A decentralized, private-first messaging app
                        </div>

                        <div className="welcome-header">
                            <div className="welcome-logo">
                                <MessageCircle className="welcome-logo-icon" />
                            </div>
                            <h1 className="welcome-brand">{t('title')}</h1>
                            <div className="welcome-steps">
                                <div className={`welcome-step ${step >= 1 ? 'welcome-step--active' : ''}`} />
                                <div className={`welcome-step ${step >= 2 ? 'welcome-step--active' : ''}`} />
                            </div>
                        </div>

                        {step === 1 && (
                            <div className="welcome-step-content">
                                <div className="welcome-intro">
                                    <p className="welcome-description">{t('description')}</p>
                                </div>

                                <div className="welcome-features">
                                    {FEATURES.map((feature) => (
                                        <FeatureCard
                                            key={feature.title}
                                            icon={feature.icon}
                                            title={feature.title}
                                            desc={feature.desc}
                                        />
                                    ))}
                                </div>

                                <div className="welcome-actions">
                                    <Button
                                        variant="primary"
                                        onClick={() => setStep(2)}
                                        size="lg"
                                        isFullWidth
                                    >
                                        Get Started
                                        <ArrowRight size={20} />
                                    </Button>
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="welcome-step-content">
                                <div className="welcome-intro">
                                    <div className="welcome-avatar">
                                        <User size={32} />
                                    </div>
                                    <h2 className="welcome-title">{t('create-identity.title')}</h2>
                                    <p className="welcome-description">
                                        {t('create-identity.description')}
                                    </p>
                                </div>

                                <div className="welcome-form">
                                    <div className="welcome-input-group">
                                        <input
                                            type="text"
                                            className="welcome-input"
                                            placeholder={t('create-identity.placeholder')}
                                            value={displayName}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !isGenerating) {
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
                                    </div>

                                    {errorMessage && (
                                        <div className="welcome-error">
                                            {errorMessage}
                                        </div>
                                    )}
                                </div>

                                <div className="welcome-actions">
                                    <Button
                                        variant="primary"
                                        onClick={handleCreateIdentity}
                                        disabled={isGenerating}
                                        isLoading={isGenerating}
                                        size="lg"
                                        isFullWidth
                                    >
                                        {isGenerating
                                            ? t('create-identity.creating')
                                            : t('create-identity.create-identity')}
                                    </Button>
                                    
                                    <Button
                                        variant="ghost"
                                        onClick={() => setStep(1)}
                                        disabled={isGenerating}
                                        isFullWidth
                                    >
                                        Back
                                    </Button>
                                </div>
                            </div>
                        )}
                    </Dialog.Content>
                </div>
            </Dialog.Portal>
        </Dialog.Root>
    );
}

function FeatureCard({
    icon,
    title,
    desc,
}: Readonly<{
    icon: React.ReactNode;
    title: string;
    desc: string;
}>) {
    return (
        <div className="welcome-feature">
            <div className="welcome-feature-icon">{icon}</div>
            <div className="welcome-feature-content">
                <h3 className="welcome-feature-title">{title}</h3>
                <p className="welcome-feature-desc">{desc}</p>
            </div>
        </div>
    );
}

export default WelcomeGuide;
