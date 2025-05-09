import { useEffect, useState } from 'react';

import Button from '../../../components/Button';
import { logger } from '../../../lib/logger';
import { useSmash } from '../../../providers/SmashContext';

interface Profile {
    title: string;
    description: string;
    avatar: string;
}

type SaveStatus = 'success' | 'error' | 'unsaved' | 'saving' | null;

export function ProfileSettings() {
    const [saveStatus, setSaveStatus] = useState<SaveStatus>(null);
    const [formData, setFormData] = useState<Profile>({
        title: '',
        description: '',
        avatar: '',
    });
    const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout>();
    const [successTimeoutId, setSuccessTimeoutId] = useState<NodeJS.Timeout>();

    const { profile, updateProfile } = useSmash();

    useEffect(() => {
        if (profile) {
            setFormData(profile);
        }
    }, [profile]);

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
            await updateProfile(data);
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

    return (
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
                    <Button
                        className={`full`}
                        onClick={handleManualSave}
                        variant={
                            saveStatus === 'success' ? 'success' : 'primary'
                        }
                        disabled={
                            saveStatus === 'saving' ||
                            saveStatus === 'success' ||
                            saveStatus === null
                        }
                    >
                        {(() => {
                            switch (saveStatus) {
                                case 'saving':
                                    return (
                                        <>
                                            <div className="spinner" />
                                            <span>Saving...</span>
                                        </>
                                    );
                                case 'success':
                                    return 'Saved!';
                                case 'unsaved':
                                    return 'Save Changes';
                                case 'error':
                                    return 'Try Again';
                                default:
                                    return 'No Changes';
                            }
                        })()}
                    </Button>
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
    );
}
