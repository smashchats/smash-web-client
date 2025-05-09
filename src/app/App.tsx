import { useEffect } from 'react';

import BottomNav from '../components/BottomNav';
import { initializeChatStore } from '../hooks/useChatStore';
import { initializeMessaging } from '../init/initializeMessaging';
import { logger } from '../lib/logger';
import { smashService } from '../lib/smash/smash-service';
import { useSmash } from '../providers/SmashContext';
import AppRoutes from './routes';

export default function App() {
    const { identity, smashUser } = useSmash();
    initializeChatStore();
    initializeMessaging();

    useEffect(() => {
        if (!identity || !smashUser) return;

        (async () => {
            try {
                logger.info('Testing connection to Smash backend...');
                const conversations = await smashService.getConversations();
                logger.info('Fetched conversations:', conversations);
            } catch (err) {
                logger.error('Failed to fetch conversations from backend', err);
            }
        })();
    }, [identity, smashUser]);

    return (
        <>
            <AppRoutes />
            <BottomNav />
        </>
    );
}
