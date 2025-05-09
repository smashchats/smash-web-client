import type { IIMPeerIdentity } from 'smash-node-lib';

import type { SMEConfig } from './db';

export interface StoredIdentity {
    id: string; // could be "current" or a did (e.g., "did:key:abc123...")
    serialized: IIMPeerIdentity;
    profile?: StoredProfile;
    smeConfig: SMEConfig;
    createdAt: number;
    lastUsedAt: number;
}

export interface StoredProfile {
    title: string;
    description: string;
    avatar: string;
}
