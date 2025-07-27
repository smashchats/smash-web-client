import { useEffect } from 'react';
import { useIdentityContext } from '@src/features/identity';

export function AppInitializer() {
  const { isInitialized } = useIdentityContext();

  useEffect(() => {
    // Identity is loaded on mount by the hook itself
    // Add messaging or other startup logic here if needed, after isInitialized
    if (isInitialized) {
      // e.g., start messaging service
    }
  }, [isInitialized]);

  return null;
} 
