import { Check, Copy } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useEffect, useState } from 'react';
import { IMPeerIdentity, SmashUser } from 'smash-node-lib';

import { DEFAULT_SME_CONFIG } from '../../config/constants';
import { logger } from '../../lib/logger';
import { copyToClipboard } from '../../lib/utils';

interface Profile {
    title: string;
    description: string;
    avatar: string;
}

interface SMEConfig {
    url: string;
    smePublicKey: string;
}

interface SettingsProps {
    onLogout: () => Promise<void>;
    profile: Profile | null;
    onUpdateProfile: (profile: Profile) => Promise<void>;
    smeConfig: SMEConfig | null;
    onUpdateSME: (config: SMEConfig) => Promise<void>;
    identity: IMPeerIdentity | null;
    smashUser: SmashUser | null;
}

type SaveStatus = 'success' | 'error' | 'unsaved' | 'saving' | null;
type SMEStatus = 'success' | 'error' | 'unsaved' | null;

export function Settings({
    onLogout,
    profile,
    onUpdateProfile,
    smeConfig,
    onUpdateSME,
    identity,
    smashUser,
}: SettingsProps) {
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [saveStatus, setSaveStatus] = useState<SaveStatus>(null);
    const [formData, setFormData] = useState<Profile>({
        title: '',
        description: '',
        avatar: '',
    });
    const [smeFormData, setSmeFormData] =
        useState<SMEConfig>(DEFAULT_SME_CONFIG);
    const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout>();
    const [successTimeoutId, setSuccessTimeoutId] = useState<NodeJS.Timeout>();
    const [isSavingSME, setIsSavingSME] = useState(false);
    const [smeStatus, setSmeStatus] = useState<SMEStatus>(null);
    const [didCopied, setDidCopied] = useState(false);
    const [copyError, setCopyError] = useState<string | null>(null);
    const [didDocumentString, setDidDocumentString] = useState<string | null>(
        null,
    );
    const [isLoadingDID, setIsLoadingDID] = useState(true);

    useEffect(() => {
        if (profile) {
            setFormData(profile);
        }
    }, [profile]);

    useEffect(() => {
        if (smeConfig) {
            setSmeFormData(smeConfig);
        }
    }, [smeConfig]);

    // Preload DID document when component mounts or when smashUser changes
    useEffect(() => {
        const loadDIDDocument = async () => {
            if (!identity || !smashUser) {
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
    }, [smashUser, identity]);

    const reloadDIDDocument = async () => {
        setDidDocumentString(null);

        if (!identity || !smashUser) {
            return;
        }

        try {
            setIsLoadingDID(true);
            const doc = await smashUser.getDIDDocument();
            setDidDocumentString(JSON.stringify(doc, null, 2));
            logger.info('DID document reloaded successfully');
        } catch (error) {
            logger.error('Failed to reload DID document', error);
            setCopyError('Error reloading DID document');
        } finally {
            setIsLoadingDID(false);
        }
    };

    useEffect(() => {
        return () => {
            if (timeoutId) clearTimeout(timeoutId);
            if (successTimeoutId) clearTimeout(successTimeoutId);
        };
    }, [timeoutId, successTimeoutId]);

    const saveProfile = async (data: Profile) => {
        try {
            logger.debug('Saving profile', { data });
            setSaveStatus('saving');
            await onUpdateProfile(data);
            setSaveStatus('success');
            const successId = setTimeout(() => setSaveStatus(null), 2000);
            setSuccessTimeoutId(successId);
            logger.info('Profile saved successfully');
        } catch (error) {
            logger.error('Failed to save profile', error);
            setSaveStatus('error');
        }
    };

    const handleProfileChange =
        (field: keyof Profile) => (e: React.ChangeEvent<HTMLInputElement>) => {
            const newFormData = { ...formData, [field]: e.target.value };
            setFormData(newFormData);
            setSaveStatus('unsaved');
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            const id = setTimeout(() => saveProfile(newFormData), 1000);
            setTimeoutId(id);
        };

    const handleTextAreaChange = (
        e: React.ChangeEvent<HTMLTextAreaElement>,
    ) => {
        const newFormData = { ...formData, description: e.target.value };
        setFormData(newFormData);
        setSaveStatus('unsaved');
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        const id = setTimeout(() => saveProfile(newFormData), 1000);
        setTimeoutId(id);
    };

    const handleManualSave = () => {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        saveProfile(formData);
    };

    const handleSMEChange =
        (field: keyof SMEConfig) =>
        (e: React.ChangeEvent<HTMLInputElement>) => {
            setSmeFormData((prev) => ({ ...prev, [field]: e.target.value }));
            setSmeStatus('unsaved');
        };

    const handleSaveSME = async () => {
        try {
            logger.debug('Saving SME configuration', { config: smeFormData });
            setIsSavingSME(true);
            await onUpdateSME(smeFormData);
            setSmeStatus('success');

            // Reload DID document after successful SME config update
            await reloadDIDDocument();

            setTimeout(() => setSmeStatus(null), 2000);
            logger.info(
                'SME configuration saved successfully and DID document updated',
            );
        } catch (error) {
            logger.error('Failed to save SME configuration', error);
            setSmeStatus('error');
        } finally {
            setIsSavingSME(false);
        }
    };

    const handleLogout = async () => {
        try {
            logger.info('Initiating logout');
            setIsLoggingOut(true);
            await onLogout();
            logger.info('Logout completed successfully');
        } catch (error) {
            logger.error('Logout failed', error);
        } finally {
            setIsLoggingOut(false);
        }
    };

    const handleCopyDID = async () => {
        if (!didDocumentString) {
            setCopyError('DID document not available');
            return;
        }

        try {
            logger.debug('Copying DID document');
            setCopyError(null);

            // Use preloaded DID document
            const result = await copyToClipboard(didDocumentString);
            if (!result.success) {
                throw new Error(
                    result.errorMessage || 'Failed to copy to clipboard',
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
        <div className="settings-container">
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
                                            size={200}
                                            level="H"
                                            className="qr-code"
                                        />
                                    </div>
                                )}
                                <button
                                    className={`button ${didCopied ? 'button--success' : 'button--primary'} did-copy-button`}
                                    onClick={handleCopyDID}
                                    disabled={
                                        isLoadingDID || !didDocumentString
                                    }
                                >
                                    {isLoadingDID ? (
                                        <>
                                            <div className="spinner" />
                                            <span>Loading...</span>
                                        </>
                                    ) : didCopied ? (
                                        <>
                                            <Check size={16} />
                                            Copied!
                                        </>
                                    ) : (
                                        <>
                                            <Copy size={16} />
                                            Copy DID Document
                                        </>
                                    )}
                                </button>
                                {copyError && (
                                    <div className="status-message error">
                                        <span>{copyError}</span>
                                    </div>
                                )}
                            </div>
                            <p className="did-help-text">
                                Click the button above to copy your DID document
                                to share with peers. The copied document will
                                include your current endpoints configuration.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="settings-section">
                <h2 className="settings-section-title">Profile Settings</h2>
                <div className="settings-card">
                    <div className="settings-form">
                        <div className="form-group">
                            <label>Title</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={handleProfileChange('title')}
                                placeholder="Enter your title"
                            />
                        </div>
                        <div className="form-group">
                            <label>Description</label>
                            <textarea
                                value={formData.description}
                                onChange={handleTextAreaChange}
                                placeholder="Enter your description"
                            />
                        </div>
                        <button
                            className={`button ${
                                saveStatus === 'success'
                                    ? 'button--success'
                                    : 'button--primary'
                            } ${saveStatus === null ? 'button--disabled' : ''}`}
                            onClick={handleManualSave}
                            disabled={
                                saveStatus === 'saving' ||
                                saveStatus === 'success' ||
                                saveStatus === null
                            }
                        >
                            {saveStatus === 'saving' ? (
                                <>
                                    <div className="spinner" />
                                    <span>Saving...</span>
                                </>
                            ) : saveStatus === 'success' ? (
                                'Saved!'
                            ) : saveStatus === 'unsaved' ? (
                                'Save Changes'
                            ) : saveStatus === 'error' ? (
                                'Try Again'
                            ) : (
                                'No Changes'
                            )}
                        </button>
                        {saveStatus === 'error' && (
                            <div className="status-message error">
                                <span>
                                    Failed to save profile. Please try again.
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="settings-section">
                <h2 className="settings-section-title">SME Configuration</h2>
                <div className="settings-card">
                    <div className="settings-form">
                        <div className="form-group">
                            <label>SME URL</label>
                            <input
                                type="text"
                                value={smeFormData.url}
                                onChange={handleSMEChange('url')}
                                placeholder="Enter SME URL"
                            />
                        </div>
                        <div className="form-group">
                            <label>SME Public Key</label>
                            <input
                                type="text"
                                value={smeFormData.smePublicKey}
                                onChange={handleSMEChange('smePublicKey')}
                                placeholder="Enter SME public key"
                            />
                        </div>
                        <button
                            className={`button button--primary ${
                                smeStatus === 'unsaved'
                                    ? ''
                                    : 'button--disabled'
                            }`}
                            onClick={handleSaveSME}
                            disabled={isSavingSME || smeStatus !== 'unsaved'}
                        >
                            {isSavingSME ? (
                                <>
                                    <div className="spinner" />
                                    <span>Saving...</span>
                                </>
                            ) : (
                                'Save SME Configuration'
                            )}
                        </button>
                        {smeStatus === 'success' && (
                            <div className="status-message success">
                                <span>
                                    SME configuration saved successfully!
                                </span>
                            </div>
                        )}
                        {smeStatus === 'error' && (
                            <div className="status-message error">
                                <span>
                                    Failed to save SME configuration. Please try
                                    again.
                                </span>
                            </div>
                        )}
                        {smeStatus === 'unsaved' && (
                            <div className="status-message info">
                                <span>Unsaved changes</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="settings-section">
                <h2 className="settings-section-title">Account</h2>
                <div className="settings-card">
                    <button
                        className="button button--outline-destructive button--full"
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                    >
                        {isLoggingOut ? (
                            <>
                                <div className="spinner" />
                                <span>Logging out...</span>
                            </>
                        ) : (
                            'Logout'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
