import { Navigate, useLocation } from 'react-router-dom';

import { useIdentityContext } from '@src/features/identity';

export default function AppGuard({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    const { isInitialized, identity } = useIdentityContext();
    const location = useLocation();

    if (!isInitialized) return null;

    if (!identity && location.pathname !== '/welcome') {
        return <Navigate to="/welcome" replace />;
    }

    return <>{children}</>;
}
