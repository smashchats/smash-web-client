import { useContext } from 'react';

import {
    IdentityContext,
    type IdentityContextValue,
} from '../context/IdentityContext';

export function useIdentityContext(): IdentityContextValue {
    const context = useContext(IdentityContext);

    if (!context) {
        throw new Error(
            'useIdentityContext must be used within an IdentityProvider',
        );
    }

    return context;
}
