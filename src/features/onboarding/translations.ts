import type { Translation } from '../../app/i18n';

export const welcome_en: Translation = {
    title: 'Welcome to Smashchats',
    description: 'A decentralized, private-first messaging app.',
    features: {
        'end-to-end-encrypted': {
            title: 'End-to-End Encrypted',
            desc: 'Your messages are encrypted and can only be read by you and your recipients.',
        },
        'private-by-design': {
            title: 'Private by Design',
            desc: 'No data is stored on our servers. Your conversations stay on your device.',
        },
        decentralized: {
            title: 'Decentralized',
            desc: 'Built on a decentralized network, ensuring no single point of failure.',
        },
        'media-sharing': {
            title: 'Media Sharing',
            desc: 'Share photos, videos, and audio messages securely.',
        },
    },
    continue: 'Continue',
    'create-identity': {
        title: 'Create Your Identity',
        description: 'Your identity is your key to the Smash network.',
        'display-name': 'Your name, an alias...',
        placeholder: 'Your name (optional)',
        creating: 'Creating...',
        'create-identity': 'Create Identity',
        'generation-failed': 'Identity generation failed.',
    },
} satisfies Translation;

export const welcome_fr: Translation = {
    title: 'Bienvenue sur Smash',
    description: 'Une application de messagerie décentralisée et privée.',
    features: {
        'end-to-end-encrypted': {
            title: 'Chiffrement de bout en bout',
            desc: 'Tes messages sont chiffrés et ne peuvent être lus que par toi et tes destinataires.',
        },
        'private-by-design': {
            title: 'Privé par conception',
            desc: "Aucune donnée n'est stockée sur nos serveurs. Tes conversations restent sur ton appareil.",
        },
        decentralized: {
            title: 'Décentralisé',
            desc: 'Construit sur un réseau décentralisé, assurant aucun point de défaillance unique.',
        },
        'media-sharing': {
            title: 'Partage de médias',
            desc: 'Partage des photos, des vidéos et des messages audio de manière sécurisée.',
        },
    },
    continue: 'Continuer',
    'create-identity': {
        title: 'Créer ton identité',
        description: 'Ton identité est ta clé pour le réseau Smash.',
        'display-name': 'Un pseudo, ton prénom...',
        placeholder: 'Ton nom (optionnel)',
        creating: 'Création en cours...',
        'create-identity': 'Créer ton identité',
        'generation-failed': 'La création de ton identité a échoué.',
    },
} satisfies Translation;
