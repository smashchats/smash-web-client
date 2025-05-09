import Dexie, { type Table } from 'dexie';
import type { DIDDocument, DIDString } from 'smash-node-lib';

import type { SmashConversation, SmashMessage } from '../types/smash';
import type { StoredIdentity, StoredProfile } from './types';

export interface SMEConfig {
    url: string;
    smePublicKey: string;
}

export interface StoredPeerProfile extends StoredProfile {
    id: DIDString;
}

class AppDB extends Dexie {
    messages!: Table<SmashMessage, string>; // id = sha256
    conversations!: Table<SmashConversation, string>; // id = UUID or hash
    didDocuments!: Table<DIDDocument, DIDString>; // id = did
    peerProfiles!: Table<StoredPeerProfile, DIDString>; // id = did
    identity!: Table<StoredIdentity, string>; // singleton, id = "current"

    constructor() {
        super('AppDB');

        this.version(1).stores({
            messages: 'id,conversationId,timestamp',
            conversations: 'id,updatedAt',
            didDocuments: 'id',
            peerProfiles: 'id',
            identity: 'id,lastUsedAt',
        });
    }

    // Identity
    async setIdentity(identity: StoredIdentity) {
        await this.identity.put(identity, 'current');
    }

    async getIdentity(): Promise<StoredIdentity | undefined> {
        return this.identity.get('current');
    }

    async clearIdentity() {
        await this.identity.clear();
    }

    // Messages
    async addMessage(message: SmashMessage) {
        return this.messages.put(message);
    }

    async getMessages(conversationId: string): Promise<SmashMessage[]> {
        return this.messages
            .where('conversationId')
            .equals(conversationId)
            .sortBy('timestamp');
    }

    async getMessage(id: string): Promise<SmashMessage | undefined> {
        return this.messages.get(id);
    }

    async updateMessageStatus(id: string, status: SmashMessage['status']) {
        await this.messages.update(id, { status });
    }

    // Conversations
    async getConversation(id: string): Promise<SmashConversation | undefined> {
        return this.conversations.get(id);
    }

    async getConversations(): Promise<SmashConversation[]> {
        return this.conversations.orderBy('updatedAt').reverse().toArray();
    }

    async addConversation(convo: SmashConversation) {
        return this.conversations.put(convo);
    }

    async updateConversation(convo: SmashConversation) {
        return this.conversations.put(convo);
    }

    // DID Documents
    async addDIDDocument(doc: DIDDocument) {
        return this.didDocuments.put(doc);
    }

    async getDIDDocument(did: DIDString): Promise<DIDDocument | undefined> {
        return this.didDocuments.get(did);
    }

    async getAllDIDDocuments(): Promise<DIDDocument[]> {
        return this.didDocuments.toArray();
    }

    // Peer Profiles
    async setPeerProfile(id: DIDString, profile: StoredProfile) {
        return this.peerProfiles.put({ ...profile, id });
    }

    async getPeerProfile(
        id: DIDString,
    ): Promise<StoredPeerProfile | undefined> {
        return this.peerProfiles.get(id);
    }

    async getAllPeerProfiles(): Promise<Record<string, StoredProfile>> {
        const all = await this.peerProfiles.toArray();
        return Object.fromEntries(all.map((p) => [p.id, p]));
    }

    // Cleanup
    async deleteDatabase() {
        await this.delete();
    }
}

export const db = new AppDB();
