export const DEFAULT_SME_CONFIG = {
    url: 'ws://localhost:3210/',
    smePublicKey:
        'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEg6rwXUOg3N18rZlQRS8sCmKGuB4opGtTXvYi7DkXltVzK0rEVd91HgM7L9YEyTsM9ntJ8Ye+rHey0LiUZwFwAw==',
} as const;

export const CURRENT_USER = 'You' as const;

export type View = 'messages' | 'explore' | 'settings';
