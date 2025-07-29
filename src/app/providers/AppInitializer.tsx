import { useIdentityContext } from '@features/identity';
import { usePeerInit } from '@features/identity/hooks/usePeerInit';
import { useMessagingHandlers } from '@features/messaging/hooks/useMessagingHandlers';
import { usePeerHandlers } from '@features/messaging/hooks/usePeerHandlers';
import { useSmashMessaging } from '@features/messaging/hooks/useSmashMessaging';

export function AppInitializer() {
    const { identity, smashUser } = useIdentityContext();
    const messaging = useSmashMessaging(smashUser);

    // Set up event handlers for messaging and peer interactions
    useMessagingHandlers();
    usePeerHandlers();

    // Initialize peers once messaging is ready
    usePeerInit(identity, messaging.isInitialized);

    return null;
}
