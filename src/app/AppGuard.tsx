import { Navigate, useLocation } from 'react-router-dom';

import { useSmash } from '../providers/SmashContext';

export default function AppGuard({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    const { isInitialized, identity } = useSmash();
    const location = useLocation();

    if (!isInitialized) return null;

    if (!identity && location.pathname !== '/welcome') {
        return <Navigate to="/welcome" replace />;
    }

    return <>{children}</>;
}
