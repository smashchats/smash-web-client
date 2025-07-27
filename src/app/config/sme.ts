import type { SMEConfigJSON } from 'smash-node-lib';

// SME configuration from environment variables with required defaults
export const DEFAULT_SME_CONFIG: SMEConfigJSON = {
    url: import.meta.env.VITE_SME_URL,
    smePublicKey: import.meta.env.VITE_SME_PUBLIC_KEY,
    keyAlgorithm: { name: 'ECDH', namedCurve: 'P-256' },
    encryptionAlgorithm: { name: 'AES-GCM', length: 256 },
    challengeEncoding: 'base64' as const,
};

if (!DEFAULT_SME_CONFIG.url || !DEFAULT_SME_CONFIG.smePublicKey) {
    throw new Error('SME configuration not found in environment variables');
}

export const CURRENT_USER = 'You' as const;

export const __DEV__ =
    !import.meta.env.VITE_ENV || import.meta.env.VITE_ENV === 'development';
