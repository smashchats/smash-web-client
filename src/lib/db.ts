import { DBSchema, IDBPDatabase, openDB } from 'idb';

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
}

export interface StoredMessage {
    id: string;
    conversationId: string;
    content: string;
    sender: string;
    timestamp: string;
    status: 'sent' | 'delivered' | 'read' | 'error';
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

export async function initDB() {
    return SmashDB.getInstance().init();
}

class SmashDB {
    private static instance: SmashDB;
    private db: IDBPDatabase<SmashDBSchema> | null = null;
    private dbName = 'smash-db';
    private version = 1;

    private constructor() {}

    static getInstance(): SmashDB {
        if (!SmashDB.instance) {
            SmashDB.instance = new SmashDB();
        }
        return SmashDB.instance;
    }

    async init(): Promise<void> {
        if (this.db) return;

        this.db = await openDB<SmashDBSchema>(this.dbName, this.version, {
            upgrade(db) {
                // Create messages store
                const messageStore = db.createObjectStore('messages', {
                    keyPath: 'id',
                });
                messageStore.createIndex('by-conversation', 'conversationId');
                messageStore.createIndex('by-timestamp', 'timestamp');

                // Create conversations store
                const conversationsStore = db.createObjectStore(
                    'conversations',
                    {
                        keyPath: 'id',
                    },
                );
                conversationsStore.createIndex('by-updated', 'updatedAt');
            },
        });
    }

    async addMessage(message: StoredMessage): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');

        await this.db.put('messages', message);

        // Update conversation
        const conversation = (await this.db.get(
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
        if (message.sender !== message.conversationId) {
            conversation.unreadCount++;
        }

        await this.db.put('conversations', conversation);
    }

    async updateMessageStatus(
        messageId: string,
        status: StoredMessage['status'],
    ): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');

        const message = await this.db.get('messages', messageId);
        if (!message) return;

        message.status = status;
        await this.db.put('messages', message);

        // Update conversation if it's the last message
        const conversation = await this.db.get(
            'conversations',
            message.conversationId,
        );
        if (conversation?.lastMessage?.id === messageId) {
            conversation.lastMessage = message;
            await this.db.put('conversations', conversation);
        }
    }

    async getMessages(
        conversationId: string,
        limit = 50,
    ): Promise<StoredMessage[]> {
        if (!this.db) throw new Error('Database not initialized');

        return this.db.getAllFromIndex(
            'messages',
            'by-conversation',
            IDBKeyRange.bound(
                [conversationId, ''],
                [conversationId + '\uffff', ''],
            ),
            limit,
        );
    }

    async getConversations(): Promise<StoredConversation[]> {
        if (!this.db) throw new Error('Database not initialized');

        return this.db.getAllFromIndex('conversations', 'by-updated');
    }

    async markConversationAsRead(conversationId: string): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');

        const conversation = await this.db.get('conversations', conversationId);
        if (!conversation) return;

        conversation.unreadCount = 0;
        await this.db.put('conversations', conversation);
    }

    async close(): Promise<void> {
        if (!this.db) return;
        this.db.close();
        this.db = null;
    }
}

export const db = SmashDB.getInstance();
