import { DBSchema, IDBPDatabase, openDB } from 'idb';
import { DIDDocument, IIMPeerIdentity } from 'smash-node-lib';

import { logger } from './logger';

// Types
interface StoredPeerProfile extends StoredProfile {
    id: string;
}

// Define store names as a const array to help with typing
const STORE_NAMES = [
    'messages',
    'conversations',
    'identity',
    'didDocuments',
    'peerProfiles',
] as const;

type StoreNames = (typeof STORE_NAMES)[number];

// Define index names for type safety
type MessageIndexNames = 'by-conversation' | 'by-timestamp';
type ConversationIndexNames = 'by-updated';
type IndexNames = MessageIndexNames | ConversationIndexNames;

interface SmashDBSchema extends DBSchema {
    messages: {
        key: string;
        value: StoredMessage;
        indexes: {
            'by-conversation': string;
            'by-timestamp': string;
        };
    };
    conversations: {
        key: string;
        value: StoredConversation;
        indexes: {
            'by-updated': string;
        };
    };
    identity: {
        key: 'current';
        value: {
            serializedIdentity: IIMPeerIdentity;
            profile: StoredProfile | null;
            smeConfig: SMEConfig | null;
        };
    };
    didDocuments: {
        key: string;
        value: DIDDocument;
    };
    peerProfiles: {
        key: string;
        value: StoredPeerProfile;
    };
}

export interface StoredMessage {
    id: string;
    conversationId: string;
    content: string;
    sender: string;
    timestamp: string;
    status: 'sent' | 'delivered' | 'read' | 'error';
}

export interface StoredProfile {
    title: string;
    description: string;
    avatar: string;
}

export interface SMEConfig {
    url: string;
    smePublicKey: string;
}

export interface StoredConversation {
    id: string;
    title: string;
    lastMessage?: StoredMessage;
    unreadCount: number;
    participants: string[];
    type: 'direct' | 'group';
    updatedAt: string;
}

// Database initialization
export async function initDB() {
    return SmashDB.getInstance().init();
}

// Database types
interface StoreConfig {
    keyPath: string | null;
    indexes?: Array<{
        name: string & IndexNames; // This ensures the name is both a string (for IDB) and our IndexNames type
        keyPath: string;
    }>;
}

type StoreConfigs = {
    [K in StoreNames]: StoreConfig;
};

// Main database class
class SmashDB {
    private static instance: SmashDB;
    private db: IDBPDatabase<SmashDBSchema> | null = null;
    private readonly dbName = 'smash-db';

    private readonly stores: StoreConfigs = {
        messages: {
            keyPath: 'id',
            indexes: [
                { name: 'by-conversation', keyPath: 'conversationId' },
                { name: 'by-timestamp', keyPath: 'timestamp' },
            ],
        },
        conversations: {
            keyPath: 'id',
            indexes: [{ name: 'by-updated', keyPath: 'updatedAt' }],
        },
        identity: { keyPath: null },
        didDocuments: { keyPath: 'id' },
        peerProfiles: { keyPath: 'id' },
    } as const;

    private constructor() {}

    static getInstance(): SmashDB {
        if (!SmashDB.instance) {
            SmashDB.instance = new SmashDB();
        }
        return SmashDB.instance;
    }

    private checkConnection() {
        if (!this.db) {
            logger.error('Database not initialized');
            throw new Error('Database not initialized');
        }
    }

    async init(): Promise<void> {
        if (this.db) {
            logger.debug('Database already initialized');
            return;
        }

        try {
            logger.info('Initializing database', { name: this.dbName });

            // Step 1: First open with no version => get current version if DB exists
            const tempDb = await openDB<SmashDBSchema>(this.dbName);
            const currentVersion = tempDb.version;
            logger.info(`Opened DB at existing version: ${currentVersion}`);

            // Check for missing stores
            const missingStores: StoreNames[] = [];
            for (const storeName of STORE_NAMES) {
                if (!tempDb.objectStoreNames.contains(storeName)) {
                    missingStores.push(storeName);
                }
            }

            // Close it if we're going to reopen with an upgrade
            tempDb.close();

            // If we have nothing to create, re-open without specifying version
            if (missingStores.length === 0) {
                logger.info(
                    'No missing stores, opening the existing DB handle again.',
                );
                this.db = await openDB<SmashDBSchema>(this.dbName);
            } else {
                // Step 2: Reopen with currentVersion + 1 to allow store creation
                logger.info('Missing stores:', missingStores);
                logger.info(
                    `Upgrading to version ${currentVersion + 1} to create missing stores.`,
                );
                this.db = await openDB<SmashDBSchema>(
                    this.dbName,
                    currentVersion + 1,
                    {
                        upgrade: (db) => {
                            logger.info(
                                'Running upgrade callback to create missing stores',
                            );
                            for (const storeName of missingStores) {
                                logger.debug('Creating store', { storeName });
                                const config = this.stores[storeName];
                                const store = db.createObjectStore(
                                    storeName as StoreNames,
                                    {
                                        keyPath: config.keyPath,
                                    },
                                );

                                // Create indexes if any exist
                                if (config.indexes) {
                                    for (const index of config.indexes) {
                                        // Type assertion for IDB strict types
                                        (
                                            store.createIndex as (
                                                name: string,
                                                keyPath: string,
                                            ) => void
                                        )(index.name, index.keyPath);
                                        logger.debug('Created index', {
                                            storeName,
                                            indexName: index.name,
                                        });
                                    }
                                }
                            }
                            logger.info(
                                'Database upgrade completed for missing stores',
                            );
                        },
                        blocked: () => {
                            logger.warn(
                                'Database upgrade blocked by other connections',
                            );
                        },
                        blocking: () => {
                            logger.warn(
                                'Connection blocking database upgrade, closing DB',
                            );
                            this.close();
                        },
                        terminated: () => {
                            logger.error(
                                'Database connection terminated unexpectedly',
                            );
                            this.db = null;
                        },
                    },
                );
            }

            // Step 3: Validate all the stores (be sure everything is present now)
            for (const storeName of STORE_NAMES) {
                if (!this.db.objectStoreNames.contains(storeName)) {
                    const error = `Required store ${storeName} is missing after upgrade`;
                    logger.error(error);
                    throw new Error(error);
                }
            }

            logger.info('Database initialization completed successfully');
        } catch (error) {
            logger.error('Database initialization failed', { error });
            this.db = null;
            throw error;
        }
    }

    // Identity Management
    async getIdentity(): Promise<{
        serializedIdentity: IIMPeerIdentity;
        profile: StoredProfile | null;
        smeConfig: SMEConfig | null;
    } | null> {
        this.checkConnection();
        logger.debug('Getting current identity');
        const result = await this.db!.get('identity', 'current');
        return result ?? null;
    }

    async setIdentity(
        serializedIdentity: IIMPeerIdentity,
        profile: StoredProfile | null = null,
        smeConfig: SMEConfig | null = null,
    ): Promise<void> {
        this.checkConnection();
        logger.debug('Setting identity');
        await this.db!.put(
            'identity',
            { serializedIdentity, profile, smeConfig },
            'current',
        );
        logger.debug('Identity set successfully');
    }

    async updateProfile(profile: StoredProfile): Promise<void> {
        this.checkConnection();
        logger.debug('Updating profile');

        const current = await this.getIdentity();
        if (!current) {
            logger.error('No identity found for profile update');
            throw new Error('No identity found');
        }

        await this.setIdentity(
            current.serializedIdentity,
            profile,
            current.smeConfig,
        );
        logger.debug('Profile updated successfully');
    }

    async updateSMEConfig(smeConfig: SMEConfig): Promise<void> {
        this.checkConnection();
        logger.debug('Updating SME config');

        const current = await this.getIdentity();
        if (!current) {
            logger.error('No identity found for SME config update');
            throw new Error('No identity found');
        }

        await this.setIdentity(
            current.serializedIdentity,
            current.profile,
            smeConfig,
        );
        logger.debug('SME config updated successfully');
    }

    async clearIdentity(): Promise<void> {
        this.checkConnection();
        logger.info('Clearing identity and related data');

        const tx = this.db!.transaction(
            ['identity', 'conversations', 'messages'],
            'readwrite',
        );

        await Promise.all([
            tx.objectStore('identity').clear(),
            tx.objectStore('conversations').clear(),
            tx.objectStore('messages').clear(),
        ]);

        await tx.done;
        logger.info('Identity and related data cleared successfully');
    }

    // Message Management
    async addMessage(message: StoredMessage): Promise<void> {
        this.checkConnection();
        logger.debug('Adding message', { messageId: message.id });

        await this.db!.put('messages', message);

        const conversation = (await this.db!.get(
            'conversations',
            message.conversationId,
        )) || {
            id: message.conversationId,
            title: `Chat with ${message.sender}`,
            unreadCount: 0,
            participants: [message.sender],
            type: 'direct' as const,
            lastMessage: message,
            updatedAt: message.timestamp,
        };

        conversation.lastMessage = message;
        conversation.updatedAt = message.timestamp;

        await this.db!.put('conversations', conversation);
        logger.debug('Message added successfully', { messageId: message.id });
    }

    async updateMessageStatus(
        messageId: string,
        status: StoredMessage['status'],
    ): Promise<void> {
        this.checkConnection();
        logger.debug('Updating message status', { messageId, status });

        const message = await this.db!.get('messages', messageId);
        if (!message) {
            logger.warn('Message not found for status update', { messageId });
            return;
        }

        message.status = status;
        await this.db!.put('messages', message);

        const conversation = await this.db!.get(
            'conversations',
            message.conversationId,
        );
        if (conversation?.lastMessage?.id === messageId) {
            conversation.lastMessage = message;
            await this.db!.put('conversations', conversation);
        }

        logger.debug('Message status updated successfully', { messageId });
    }

    async getMessages(
        conversationId: string,
        limit = 50,
    ): Promise<StoredMessage[]> {
        this.checkConnection();
        logger.debug('Getting messages', { conversationId, limit });

        const messages = await this.db!.getAllFromIndex(
            'messages',
            'by-conversation',
            conversationId,
        );

        logger.debug('Retrieved messages', {
            conversationId,
            count: messages.length,
            returning: Math.min(messages.length, limit),
        });

        return messages.slice(-limit);
    }

    async getMessage(messageId: string): Promise<StoredMessage | undefined> {
        this.checkConnection();
        logger.debug('Getting message', { messageId });
        return this.db!.get('messages', messageId);
    }

    // Conversation Management
    async addConversation(conversation: StoredConversation): Promise<void> {
        await this.init();
        this.checkConnection();
        logger.debug('Adding conversation', {
            conversationId: conversation.id,
        });
        await this.db!.put('conversations', conversation);
        logger.debug('Conversation added successfully', {
            conversationId: conversation.id,
        });
    }

    async updateConversation(conversation: StoredConversation): Promise<void> {
        await this.init();
        this.checkConnection();
        logger.debug('Updating conversation', {
            conversationId: conversation.id,
        });
        await this.db!.put('conversations', conversation);
        logger.debug('Conversation updated successfully', {
            conversationId: conversation.id,
        });
    }

    async getConversations(): Promise<StoredConversation[]> {
        this.checkConnection();
        logger.debug('Getting all conversations');
        const conversations = await this.db!.getAllFromIndex(
            'conversations',
            'by-updated',
        );
        logger.debug('Retrieved conversations', {
            count: conversations.length,
        });
        return conversations;
    }

    async getConversation(id: string): Promise<StoredConversation | undefined> {
        await this.init();
        this.checkConnection();
        logger.debug('Getting conversation', { conversationId: id });
        const conversation = await this.db!.get('conversations', id);
        logger.debug(
            conversation ? 'Found conversation' : 'Conversation not found',
            {
                conversationId: id,
            },
        );
        return conversation;
    }

    async markConversationAsRead(conversationId: string): Promise<void> {
        this.checkConnection();
        logger.debug('Marking conversation as read', { conversationId });

        const conversation = await this.db!.get(
            'conversations',
            conversationId,
        );
        if (!conversation) {
            logger.warn('Conversation not found for marking as read', {
                conversationId,
            });
            return;
        }

        conversation.unreadCount = 0;
        await this.db!.put('conversations', conversation);
        logger.debug('Conversation marked as read', { conversationId });
    }

    async updateConversationUnreadCount(
        conversationId: string,
        unreadCount: number,
    ): Promise<void> {
        this.checkConnection();
        logger.debug('Updating conversation unread count', {
            conversationId,
            unreadCount,
        });

        const conversation = await this.db!.get(
            'conversations',
            conversationId,
        );
        if (!conversation) {
            logger.warn('Conversation not found for unread count update', {
                conversationId,
            });
            return;
        }

        conversation.unreadCount = unreadCount;
        await this.db!.put('conversations', conversation);
        logger.debug('Conversation unread count updated', { conversationId });
    }

    // DID Document Management
    async addDIDDocument(didDocument: DIDDocument): Promise<void> {
        this.checkConnection();
        logger.debug('Adding DID document', { did: didDocument.id });
        await this.db!.put('didDocuments', didDocument);
        logger.debug('DID document added successfully', {
            did: didDocument.id,
        });
    }

    async getDIDDocument(did: string): Promise<DIDDocument | undefined> {
        this.checkConnection();
        logger.debug('Getting DID document', { did });
        return this.db!.get('didDocuments', did);
    }

    async getAllDIDDocuments(): Promise<DIDDocument[]> {
        this.checkConnection();
        logger.debug('Getting all DID documents');
        const documents = await this.db!.getAll('didDocuments');
        logger.debug('Retrieved DID documents', { count: documents.length });
        return documents;
    }

    async clearDIDDocuments(): Promise<void> {
        this.checkConnection();
        logger.debug('Clearing all DID documents');
        await this.db!.clear('didDocuments');
        logger.debug('DID documents cleared successfully');
    }

    // Peer Profile Management
    async setPeerProfile(
        peerId: string,
        profile: StoredProfile,
    ): Promise<void> {
        this.checkConnection();
        logger.debug('Setting peer profile', { peerId });
        const storedProfile: StoredPeerProfile = { ...profile, id: peerId };
        await this.db!.put('peerProfiles', storedProfile);
        logger.debug('Peer profile set successfully', { peerId });
    }

    async getPeerProfile(peerId: string): Promise<StoredProfile | undefined> {
        this.checkConnection();
        logger.debug('Getting peer profile', { peerId });
        const profile = await this.db!.get('peerProfiles', peerId);
        if (profile) {
            // Destructure without id since we don't need it
            const { ...rest } = profile;
            return rest;
        }
        return undefined;
    }

    async getAllPeerProfiles(): Promise<Record<string, StoredProfile>> {
        this.checkConnection();
        logger.debug('Getting all peer profiles');
        const profiles = await this.db!.getAll('peerProfiles');
        logger.debug('Retrieved peer profiles', { count: profiles.length });
        return profiles.reduce(
            (acc, { id, ...rest }) => {
                acc[id] = rest;
                return acc;
            },
            {} as Record<string, StoredProfile>,
        );
    }

    async close(): Promise<void> {
        if (!this.db) {
            logger.debug('Database already closed');
            return;
        }
        logger.info('Closing database connection');
        this.db.close();
        this.db = null;
        logger.debug('Database connection closed successfully');
    }
}

export const db = SmashDB.getInstance();
