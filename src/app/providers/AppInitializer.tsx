import { useIdentityContext } from '@src/features/identity';
import { useSmashMessaging } from '@src/features/messaging/hooks/useSmashMessaging';
import { useMessagingHandlers } from '@src/features/messaging/hooks/useMessagingHandlers';
import { usePeerHandlers } from '@src/features/messaging/hooks/usePeerHandlers';
import { usePeerInit } from '@src/features/identity/hooks/usePeerInit';

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
