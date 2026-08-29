import type { SMEConfigJSON } from 'smash-node-lib';

// Test mode configuration - matches mock server setup
const TEST_SME_CONFIG = {
    url: 'http://localhost:12345/valid',
    smePublicKey: 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEg6rwXUOg3N18rZlQRS8sCmKGuB4opGtTXvYi7DkXltVzK0rEVd91HgM7L9YEyTsM9ntJ8Ye+rHey0LiUZwFwAw==',
};

// Test mode flags
export const __DEV__ =
    !import.meta.env.VITE_ENV || import.meta.env.VITE_ENV === 'development';

export const __TEST__ = import.meta.env.VITE_TEST_MODE === 'true';

export const TEST_TRANSPORT = import.meta.env.VITE_TEST_TRANSPORT || 'relay';

export const DISABLE_SW = import.meta.env.VITE_DISABLE_SW === 'true';

// SME configuration from environment variables with test mode support
export const DEFAULT_SME_CONFIG: SMEConfigJSON = __TEST__ ? {
    ...TEST_SME_CONFIG,
    keyAlgorithm: { name: 'ECDH', namedCurve: 'P-256' },
    encryptionAlgorithm: { name: 'AES-GCM', length: 256 },
    challengeEncoding: 'base64' as const,
} : {
    url: import.meta.env.VITE_SME_URL,
    smePublicKey: import.meta.env.VITE_SME_PUBLIC_KEY,
    keyAlgorithm: { name: 'ECDH', namedCurve: 'P-256' },
    encryptionAlgorithm: { name: 'AES-GCM', length: 256 },
    challengeEncoding: 'base64' as const,
};

// Only enforce environment variables in production mode
if (!__TEST__ && (!DEFAULT_SME_CONFIG.url || !DEFAULT_SME_CONFIG.smePublicKey)) {
    throw new Error('SME configuration not found in environment variables');
}

export const CURRENT_USER = 'You' as const;
