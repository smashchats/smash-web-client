import { useState } from 'react';

import { useIdentityContext } from '@features/identity';
import Button from '@shared/components/Button';
import { logger } from '@shared/utils/logger';

export function AccountSection() {
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const { clearIdentity } = useIdentityContext();

    const handleLogout = async () => {
        try {
            logger.info('Initiating logout');
            setIsLoggingOut(true);
            await clearIdentity();
            logger.info('Logout completed successfully');
        } catch (error) {
            logger.error('Logout failed', error);
        } finally {
            setIsLoggingOut(false);
        }
    };

    return (
        <div className="settings-section">
            <h2 className="settings-section-title">Account</h2>
            <div className="settings-card">
                <Button
                    variant="danger"
                    className="full"
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
                </Button>
            </div>
        </div>
    );
}
