import { useIdentity } from '../hooks/useIdentity';
import { IdentityContext } from './IdentityContext';

export function IdentityProvider({ children }: { children: React.ReactNode }) {
    const identity = useIdentity();
    
    return (
        <IdentityContext.Provider value={identity}>
            {children}
        </IdentityContext.Provider>
    );
} 
