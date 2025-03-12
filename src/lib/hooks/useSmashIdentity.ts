import { useEffect, useState } from 'react';
import { IMPeerIdentity, IIMPeerIdentity } from 'smash-node-lib';
import { getDidDocumentManager, importIdentity, initializeSmashMessaging } from '../smash-init';

// IndexedDB configuration
const DB_NAME = 'smash_db';
const DB_VERSION = 1;
const STORE_NAME = 'identities';
const IDENTITY_KEY = 'current_identity';

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

export function useSmashIdentity() {
    console.log('useSmashIdentity hook called');
    const [identity, setIdentity] = useState<IMPeerIdentity | null>(null);
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

    // Load identity after initialization
    useEffect(() => {
        if (!isInitialized) return;

        let mounted = true;
        console.log('Loading identity...');

        async function initializeIdentity() {
            try {
                // Try to load existing identity from IndexedDB
                const storedIdentity = await getStoredIdentity();
                console.log('Stored identity found:', !!storedIdentity);

                if (storedIdentity && mounted) {
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
            } catch (err) {
                console.error('Failed to initialize:', err);
                if (mounted) {
                    setError(err instanceof Error ? err : new Error(String(err)));
                }
            }
        }

        initializeIdentity();

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
        error,
        didDocumentManager: manager,
        isInitialized,
    };
}
