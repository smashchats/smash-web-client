import { useEffect, useState } from 'react';
import { IMPeerIdentity, IIMPeerIdentity } from 'smash-node-lib';
import { getDidDocumentManager, importIdentity, initializeSmashMessaging } from '../smash-init';

// IndexedDB configuration
const DB_NAME = 'smash_db';
const DB_VERSION = 1;
const STORE_NAME = 'identities';
const IDENTITY_KEY = 'current_identity';
const PROFILE_KEY = 'user_profile';

interface UserProfile {
    title: string;
    description: string;
}

// Helper function to initialize IndexedDB
async function initializeDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
    });
}

// Helper function to store identity in IndexedDB
async function storeIdentity(identity: IIMPeerIdentity): Promise<void> {
    const db = await initializeDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(identity, IDENTITY_KEY);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });
}

// Helper function to store profile in IndexedDB
async function storeProfile(profile: UserProfile): Promise<void> {
    const db = await initializeDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(profile, PROFILE_KEY);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });
}

// Helper function to retrieve identity from IndexedDB
async function getStoredIdentity(): Promise<IIMPeerIdentity | null> {
    const db = await initializeDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(IDENTITY_KEY);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result || null);
    });
}

// Helper function to retrieve profile from IndexedDB
async function getStoredProfile(): Promise<UserProfile | null> {
    const db = await initializeDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(PROFILE_KEY);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result || null);
    });
}

// Helper function to clear identity from IndexedDB
async function clearStoredIdentity(): Promise<void> {
    const db = await initializeDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request1 = store.delete(IDENTITY_KEY);
        const request2 = store.delete(PROFILE_KEY);

        request1.onerror = () => reject(request1.error);
        request2.onerror = () => reject(request2.error);
        
        Promise.all([
            new Promise(resolve => request1.onsuccess = resolve),
            new Promise(resolve => request2.onsuccess = resolve)
        ]).then(() => resolve());
    });
}

export function useSmashIdentity() {
    console.log('useSmashIdentity hook called');
    const [identity, setIdentity] = useState<IMPeerIdentity | null>(null);
    const [profile, setProfile] = useState<UserProfile>({ title: '', description: '' });
    const [error, setError] = useState<Error | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);

    // Initialize Smash messaging first
    useEffect(() => {
        try {
            initializeSmashMessaging();
            setIsInitialized(true);
        } catch (err) {
            console.error('Failed to initialize Smash messaging:', err);
            setError(err instanceof Error ? err : new Error(String(err)));
        }
    }, []);

    // Wrap setIdentity to also store in IndexedDB
    const setIdentityWithStorage = async (newIdentity: IMPeerIdentity) => {
        try {
            const exportedIdentity = await newIdentity.serialize();
            await storeIdentity(exportedIdentity);
            setIdentity(newIdentity);
        } catch (err) {
            console.error('Failed to store identity:', err);
            setError(err instanceof Error ? err : new Error(String(err)));
        }
    };

    // Function to update profile
    const updateProfile = async (newProfile: UserProfile) => {
        try {
            await storeProfile(newProfile);
            setProfile(newProfile);
        } catch (err) {
            console.error('Failed to store profile:', err);
            setError(err instanceof Error ? err : new Error(String(err)));
            throw err;
        }
    };

    // Function to clear identity
    const clearIdentity = async () => {
        try {
            await clearStoredIdentity();
            setIdentity(null);
            setProfile({ title: '', description: '' });
        } catch (err) {
            console.error('Failed to clear identity:', err);
            setError(err instanceof Error ? err : new Error(String(err)));
            throw err;
        }
    };

    // Load identity and profile after initialization
    useEffect(() => {
        if (!isInitialized) return;

        let mounted = true;
        console.log('Loading identity and profile...');

        async function initialize() {
            try {
                // Try to load existing identity from IndexedDB
                const [storedIdentity, storedProfile] = await Promise.all([
                    getStoredIdentity(),
                    getStoredProfile()
                ]);

                console.log('Stored identity found:', !!storedIdentity);
                console.log('Stored profile found:', !!storedProfile);

                if (mounted) {
                    if (storedProfile) {
                        setProfile(storedProfile);
                    }

                    if (storedIdentity) {
                        try {
                            console.log('Attempting to import stored identity...');
                            const importedIdentity = await importIdentity(storedIdentity);
                            console.log('Identity imported successfully');
                            setIdentity(importedIdentity);
                        } catch (err) {
                            console.error('Failed to import identity:', err);
                            setError(err instanceof Error ? err : new Error(String(err)));
                        }
                    } else {
                        console.log('No stored identity found, waiting for user to create one');
                    }
                }
            } catch (err) {
                console.error('Failed to initialize:', err);
                if (mounted) {
                    setError(err instanceof Error ? err : new Error(String(err)));
                }
            }
        }

        initialize();

        return () => {
            mounted = false;
        };
    }, [isInitialized]);

    let manager = null;
    try {
        manager = isInitialized ? getDidDocumentManager() : null;
    } catch (err) {
        console.error('Failed to get DID document manager:', err);
    }

    return {
        identity,
        setIdentity: setIdentityWithStorage,
        profile,
        updateProfile,
        clearIdentity,
        error,
        didDocumentManager: manager,
        isInitialized,
    };
}
