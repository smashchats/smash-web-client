import type { StoredProfile } from '@smash/db';
import { logger } from '@utils/logger';
import { useEffect, useState } from 'react';
import type { IMPeerIdentity, SMEConfigJSON, SmashUser } from 'smash-node-lib';

import { createSmashUser, importIdentity } from '../services/identityService';
import {
    clearStoredIdentity,
    loadStoredIdentity,
} from '../services/identityStorage';

interface SmashBootState {
    identity: IMPeerIdentity | null;
    smashUser: SmashUser | null;
    profile: StoredProfile | null;
    smeConfig: SMEConfigJSON | null;
    isReady: boolean;
    error: Error | null;
}

export function useSmashBoot() {
    const [state, setState] = useState<SmashBootState>({
        identity: null,
        smashUser: null,
        profile: null,
        smeConfig: null,
        isReady: false,
        error: null,
    });

    useEffect(() => {
        let isMounted = true;

        const bootIdentity = async () => {
            try {
                logger.info('Booting identity from storage');
                const stored = await loadStoredIdentity();

                if (!isMounted) return;

                if (stored) {
                    logger.info('Found stored identity, importing');
                    try {
                        const identity = await importIdentity(
                            stored.serialized,
                        );
                        const smashUser = await createSmashUser(
                            identity,
                            stored.smeConfig,
                        );

                        if (stored.profile) {
                            logger.debug('Updating profile', stored.profile);
                            await smashUser.updateMeta(stored.profile);
                        }

                        setState({
                            identity,
                            smashUser,
                            profile: stored.profile ?? null,
                            smeConfig: stored.smeConfig,
                            isReady: true,
                            error: null,
                        });
                    } catch (importError) {
                        logger.error('Failed to import identity', importError);
                        await clearStoredIdentity();
                        setState({
                            identity: null,
                            smashUser: null,
                            profile: null,
                            smeConfig: null,
                            isReady: true,
                            error: importError as Error,
                        });
                    }
                } else {
                    logger.debug('No stored identity found');
                    setState({
                        identity: null,
                        smashUser: null,
                        profile: null,
                        smeConfig: null,
                        isReady: true,
                        error: null,
                    });
                }
            } catch (error) {
                logger.error('Error booting identity', error);
                setState({
                    identity: null,
                    smashUser: null,
                    profile: null,
                    smeConfig: null,
                    isReady: true,
                    error: error as Error,
                });
            }
        };

        bootIdentity();

        return () => {
            isMounted = false;
        };
    }, []);

    return state;
}
