import Button from '@components/Button';
import { useIdentityContext } from '@features/identity';
import { logger } from '@utils/logger';
import { useEffect, useState } from 'react';
import type { SMEConfigJSON } from 'smash-node-lib';

type SMEStatus = 'success' | 'error' | 'unsaved' | null;

export function SmeConfiguration() {
    const [smeFormData, setSmeFormData] = useState<Partial<SMEConfigJSON>>({
        url: '',
        smePublicKey: '',
    });
    const [isSavingSME, setIsSavingSME] = useState(false);
    const [smeStatus, setSmeStatus] = useState<SMEStatus>(null);

    const { smeConfig, updateSMEConfig } = useIdentityContext();

    useEffect(() => {
        if (smeConfig) {
            setSmeFormData(smeConfig);
        }
    }, [smeConfig]);

    const handleSMEChange =
        (field: keyof SMEConfigJSON) =>
        (e: React.ChangeEvent<HTMLInputElement>) => {
            setSmeFormData((prev) => ({ ...prev, [field]: e.target.value }));
            setSmeStatus('unsaved');
        };

    const handleSaveSME = async () => {
        try {
            logger.debug('Saving SME configuration', { config: smeFormData });
            setIsSavingSME(true);
            // Fill in required fields if missing
            const fullConfig: SMEConfigJSON = {
                url: smeFormData.url || '',
                smePublicKey: smeFormData.smePublicKey || '',
                keyAlgorithm: { name: 'ECDH', namedCurve: 'P-256' },
                encryptionAlgorithm: { name: 'AES-GCM', length: 256 },
                challengeEncoding: 'base64' as const,
            };
            await updateSMEConfig(fullConfig);
            setSmeStatus('success');
            setTimeout(() => setSmeStatus(null), 2000);
            logger.info('SME configuration saved successfully');
        } catch (error) {
            logger.error('Failed to save SME configuration', error);
            setSmeStatus('error');
        } finally {
            setIsSavingSME(false);
        }
    };

    return (
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
                    <Button
                        variant={
                            smeStatus === 'success' ? 'success' : 'primary'
                        }
                        isFullWidth
                        onClick={handleSaveSME}
                        disabled={isSavingSME || smeStatus !== 'unsaved'}
                        isLoading={isSavingSME}
                    >
                        {(() => {
                            if (isSavingSME) return 'Saving...';
                            if (smeStatus === 'success') return 'Saved!';
                            return 'Save SME Configuration';
                        })()}
                    </Button>
                    {smeStatus === 'success' && (
                        <div className="status-message success">
                            <span>SME configuration saved successfully!</span>
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
    );
}
