import { AlertCircle, CheckCircle2, Loader2, LogOut, Save } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import './Settings.css';

interface SettingsProps {
    onLogout: () => void;
    profile: {
        title: string;
        description: string;
    };
    onUpdateProfile: (profile: { title: string; description: string }) => Promise<void>;
}

export function Settings({ onLogout, profile, onUpdateProfile }: SettingsProps) {
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'success' | 'error' | 'unsaved' | null>(null);
    const [formData, setFormData] = useState(profile);
    const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout>();
    const [successTimeoutId, setSuccessTimeoutId] = useState<NodeJS.Timeout>();

    useEffect(() => {
        setFormData(profile);
    }, [profile]);

    useEffect(() => {
        return () => {
            if (timeoutId) clearTimeout(timeoutId);
            if (successTimeoutId) clearTimeout(successTimeoutId);
        };
    }, [timeoutId, successTimeoutId]);

    const debouncedSave = useCallback((data: typeof profile) => {
        if (timeoutId) clearTimeout(timeoutId);
        if (successTimeoutId) clearTimeout(successTimeoutId);
        
        const newTimeoutId = setTimeout(async () => {
            setIsSaving(true);
            try {
                await onUpdateProfile(data);
                setSaveStatus('success');
                
                // Reset to default state after 2 seconds
                const newSuccessTimeoutId = setTimeout(() => {
                    setSaveStatus(null);
                }, 2000);
                setSuccessTimeoutId(newSuccessTimeoutId);
            } catch (error) {
                setSaveStatus('error');
                console.error('Failed to save profile:', error);
            } finally {
                setIsSaving(false);
            }
        }, 500);
        
        setTimeoutId(newTimeoutId);
    }, [onUpdateProfile, timeoutId, successTimeoutId]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        const newData = { ...formData, [name]: value };
        setFormData(newData);
        setSaveStatus('unsaved');
        debouncedSave(newData);
    };

    const handleManualSave = async () => {
        if (saveStatus !== 'unsaved' || isSaving) return;
        
        if (timeoutId) {
            clearTimeout(timeoutId);
            setTimeoutId(undefined);
        }
        
        setIsSaving(true);
        try {
            await onUpdateProfile(formData);
            setSaveStatus('success');
            
            const newSuccessTimeoutId = setTimeout(() => {
                setSaveStatus(null);
            }, 2000);
            setSuccessTimeoutId(newSuccessTimeoutId);
        } catch (error) {
            setSaveStatus('error');
            console.error('Failed to save profile:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleLogout = async () => {
        setIsLoggingOut(true);
        try {
            await onLogout();
        } finally {
            setIsLoggingOut(false);
        }
    };

    const getSaveButtonContent = () => {
        if (isSaving) {
            return (
                <>
                    <Loader2 className="animate-spin" />
                    <span>Saving...</span>
                </>
            );
        }
        if (saveStatus === 'success') {
            return (
                <>
                    <CheckCircle2 />
                    <span>Saved</span>
                </>
            );
        }
        if (saveStatus === 'error') {
            return (
                <>
                    <AlertCircle />
                    <span>Failed to save</span>
                </>
            );
        }
        return (
            <>
                <Save />
                <span>Save Changes</span>
            </>
        );
    };

    return (
        <div className="settings-container">
            <h1 className="settings-title">Settings</h1>
            
            <div className="settings-content">
                <div className="settings-section">
                    <h2 className="settings-section-title">Profile</h2>
                    <div className="settings-form">
                        <div className="form-group">
                            <label htmlFor="title">Title</label>
                            <input
                                type="text"
                                id="title"
                                name="title"
                                value={formData.title}
                                onChange={handleChange}
                                placeholder="Enter a short title"
                                maxLength={50}
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="description">Description</label>
                            <textarea
                                id="description"
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                placeholder="Tell us about yourself"
                                maxLength={500}
                            />
                        </div>
                        <button
                            className={`save-button ${saveStatus || ''}`}
                            onClick={handleManualSave}
                            disabled={isSaving}
                        >
                            {getSaveButtonContent()}
                        </button>
                    </div>
                </div>

                <div className="settings-section">
                    <h2 className="settings-section-title">Account</h2>
                    <div className="logout-section">
                        <button
                            onClick={handleLogout}
                            disabled={isLoggingOut}
                            className="logout-button"
                        >
                            <LogOut />
                            <span>{isLoggingOut ? 'Logging out...' : 'Log out'}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
} 
