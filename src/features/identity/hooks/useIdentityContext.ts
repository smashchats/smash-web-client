import { useContext } from 'react';

import { IdentityContext } from '../context/IdentityContext';

export function useIdentityContext() {
    const context = useContext(IdentityContext);
    if (!context) {
        throw new Error(
            'useIdentityContext must be used within IdentityProvider',
        );
    }
    return context;
}
