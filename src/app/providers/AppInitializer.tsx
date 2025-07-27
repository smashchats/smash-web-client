import { useIdentityContext } from '@src/features/identity';
import { useSmashMessaging } from '@src/features/messaging/hooks/useSmashMessaging';
import { usePeerInit } from '@src/features/identity/hooks/usePeerInit';

export function AppInitializer() {
  const { identity, smashUser } = useIdentityContext();
  
  // Initialize messaging when we have a smashUser
  const messaging = useSmashMessaging(smashUser);
  
  // Initialize peers after messaging is ready
  usePeerInit(identity, messaging.isInitialized);

  // This component doesn't render anything, it just handles initialization
  return null;
} 
