import { useEffect, useState } from 'react';
import { useSmashBoot } from '@features/identity/hooks/useSmashBoot';
import { initializeSmashEnvironment } from './config/smash';
import { AppInitializer } from './providers/AppInitializer';
import { AppProviders } from './providers/AppProviders';
import LoadingScreen from '@shared/components/LoadingScreen';
import AppRoutes from './routes';

export default function App() {
  const [isEnvReady, setIsEnvReady] = useState(false);

  // Step 1: Initialize Smash Environment
  useEffect(() => {
    try {
      initializeSmashEnvironment();
      setIsEnvReady(true);
    } catch (err) {
      console.error('Failed to init SmashMessaging environment', err);
    }
  }, []);

  // Step 2: Boot identity from storage
  const { identity, smashUser, profile, smeConfig, isReady, error } = useSmashBoot();

  // Show loading until environment is ready
  if (!isEnvReady) {
    return <LoadingScreen />;
  }

  // Show loading until identity boot is complete
  if (!isReady) {
    return <LoadingScreen />;
  }

  // If no identity, show welcome guide (handled by AppGuard)
  // If identity exists, show main app with providers
  return (
    <AppProviders 
      identity={identity}
      smashUser={smashUser}
      profile={profile}
      smeConfig={smeConfig}
      error={error}
    >
      <AppInitializer />
      <AppRoutes />
    </AppProviders>
  );
}

