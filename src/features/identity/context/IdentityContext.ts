import { createContext } from 'react';

import type { useIdentity } from '../hooks/useIdentity';

export type IdentityContextValue = ReturnType<typeof useIdentity>;

export const IdentityContext = createContext<IdentityContextValue | null>(null);
