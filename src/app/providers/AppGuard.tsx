import { useIdentityContext } from '@features/identity';
import { Navigate, useLocation } from 'react-router-dom';

export default function AppGuard({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    const { isInitialized, identity } = useIdentityContext();
    const location = useLocation();

    if (!isInitialized) return null;

    // If no identity and not on welcome page, redirect to welcome
    if (!identity && location.pathname !== '/welcome') {
        return <Navigate to="/welcome" replace />;
    }

    // Always render children (main app layout) - welcome screen will overlay on top
    return <>{children}</>;
}
