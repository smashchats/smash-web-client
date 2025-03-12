import { useEffect, useState } from 'react';

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
}

export function Settings({
    onLogout,
    profile,
    onUpdateProfile,
    smeConfig,
    onUpdateSME,
}: SettingsProps) {
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [saveStatus, setSaveStatus] = useState<
        'success' | 'error' | 'unsaved' | 'saving' | null
    >(null);
    const [formData, setFormData] = useState<Profile>({
        title: '',
        description: '',
        avatar: '',
    });
    const [smeFormData, setSmeFormData] = useState<SMEConfig>({
        url: 'wss://sme.dev.smashchats.com/',
        smePublicKey:
            'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEW45b75uMszTovqQSUDhsofhJx78A4Ytm4KV+REh2RRxwwfXVzTOmApNGU+eSoS2kEeDIpgt5ymLj5XPkVuEx+Q==',
    });
    const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout>();
    const [successTimeoutId, setSuccessTimeoutId] = useState<NodeJS.Timeout>();
    const [isSavingSME, setIsSavingSME] = useState(false);
    const [smeStatus, setSmeStatus] = useState<
        'success' | 'error' | 'unsaved' | null
    >(null);

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

    useEffect(() => {
        return () => {
            if (timeoutId) clearTimeout(timeoutId);
            if (successTimeoutId) clearTimeout(successTimeoutId);
        };
    }, [timeoutId, successTimeoutId]);

    const saveProfile = async (data: Profile) => {
        try {
            setSaveStatus('saving');
            await onUpdateProfile(data);
            setSaveStatus('success');
            const successId = setTimeout(() => setSaveStatus(null), 2000);
            setSuccessTimeoutId(successId);
        } catch {
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

    const handleTextAreaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
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
            setIsSavingSME(true);
            await onUpdateSME(smeFormData);
            setSmeStatus('success');
            setTimeout(() => setSmeStatus(null), 2000);
        } catch {
            setSmeStatus('error');
        } finally {
            setIsSavingSME(false);
        }
    };

    const handleLogout = async () => {
        try {
            setIsLoggingOut(true);
            await onLogout();
        } finally {
            setIsLoggingOut(false);
        }
    };

    return (
        <div className="settings-container">
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
                            disabled={saveStatus === 'saving' || saveStatus === 'success' || saveStatus === null}
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
                                <span>Failed to save profile. Please try again.</span>
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
                                smeStatus === 'unsaved' ? '' : 'button--disabled'
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
                                <span>SME configuration saved successfully!</span>
                            </div>
                        )}
                        {smeStatus === 'error' && (
                            <div className="status-message error">
                                <span>Failed to save SME configuration. Please try again.</span>
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
