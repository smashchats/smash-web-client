import React, { useEffect, useState } from 'react';

import { peerController } from '@src/controllers/peerController';
import { IdentityProvider, useIdentityContext } from '@src/features/identity';

function AppContent({ children }: { children: React.ReactNode }) {
  const { isInitialized } = useIdentityContext();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (isInitialized) {
      (async () => {
        await peerController.initAllPeers();
        setIsReady(true);
      })();
    }
  }, [isInitialized]);

  if (!isReady) {
    // TODO: nicer loading screen
    return <div className="loading-screen">Loading identity...</div>;
  }

  return <>{children}</>;
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <IdentityProvider>
      <AppContent>
        {/* Add ThemeProvider, MessagingProvider, etc. here as needed */}
        {children}
      </AppContent>
    </IdentityProvider>
  );
} 
