import type { DIDString, SMEConfigJSON } from 'smash-node-lib';

export interface StoredIdentity {
    id: string; // could be "current" or a did (e.g., "did:key:abc123...")
    serialized: string; // store as stringified identity
    profile?: StoredProfile;
    smeConfig: SMEConfigJSON; // Store the JSON version, preKeyPair is reconstructed from identity
    createdAt: number;
    lastUsedAt: number;
}

export interface StoredProfile {
    title: string;
    description: string;
    avatar: string;
}

export interface StoredPeerProfile extends StoredProfile {
    id: DIDString;
}
