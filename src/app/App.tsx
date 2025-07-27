import { useEffect, useState } from 'react';
import { initializeSmashEnvironment } from './config/smash';
import { AppInitializer } from './providers/AppInitializer';
import { AppProviders } from './providers/AppProviders';
import AppRoutes from './routes';

export default function App() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    try {
      initializeSmashEnvironment();
      setIsReady(true);
    } catch (err) {
      console.error('Failed to init SmashMessaging environment', err);
    }
  }, []);

  if (!isReady) {
    // TODO: nicer loading screen
    return <div className="loading-screen">Booting environment...</div>;
  }

  return (
    <AppProviders>
      <AppInitializer />
      <AppRoutes />
    </AppProviders>
  );
}
