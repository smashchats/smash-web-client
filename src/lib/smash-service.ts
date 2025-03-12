import {
    DID,
    DIDString,
    IMProtoMessage,
    IMText,
    IM_CHAT_TEXT,
    MessageStatus,
    SmashUser,
    sha256,
} from 'smash-node-lib';

import { StoredConversation, StoredMessage, db } from './db';

export type MessageCallback = (message: StoredMessage) => void;
export type ConversationCallback = (conversation: StoredConversation) => void;

class SmashService {
    private static instance: SmashService;
    private messageCallbacks: Set<MessageCallback> = new Set();
    private conversationCallbacks: Set<ConversationCallback> = new Set();
    private smashUser: SmashUser | null = null;

    private constructor() {}

    static getInstance(): SmashService {
        if (!SmashService.instance) {
            SmashService.instance = new SmashService();
        }
        return SmashService.instance;
    }

    async init(smashUser: SmashUser): Promise<void> {
        this.smashUser = smashUser;
        await db.init();

        // Set up message listeners
        this.smashUser.on(IM_CHAT_TEXT, this.handleIncomingMessage.bind(this));
        this.smashUser.on('status', this.handleMessageStatus.bind(this));
    }

    private async handleIncomingMessage(
        senderId: DIDString,
        message: IMProtoMessage,
    ): Promise<void> {
        if (!this.smashUser) throw new Error('SmashService not initialized');

        const storedMessage: StoredMessage = {
            id: message.sha256 || crypto.randomUUID(),
            content: message.data as string,
            sender: senderId,
            conversationId: senderId,
            timestamp: message.timestamp || new Date().toISOString(),
            status: 'delivered',
        };

        await db.addMessage(storedMessage);
        this.messageCallbacks.forEach((cb) => cb(storedMessage));
    }

    private async handleMessageStatus(
        status: MessageStatus,
        messageIds: sha256[],
    ): Promise<void> {
        for (const messageId of messageIds) {
            if (status === 'received') {
                status = 'delivered';
            }
            await db.updateMessageStatus(messageId, status);
        }
    }

    async sendMessage(recipientDid: string, content: string): Promise<void> {
        if (!this.smashUser) throw new Error('SmashService not initialized');

        const recipientDoc = await SmashUser.resolve(recipientDid as DID);
        const message = new IMText(content);
        const sent = await this.smashUser.send(recipientDoc, message);

        const storedMessage: StoredMessage = {
            id: sent.sha256,
            content: content,
            sender: this.smashUser.did,
            conversationId: recipientDid,
            timestamp: sent.timestamp,
            status: 'sent',
        };

        await db.addMessage(storedMessage);
        this.messageCallbacks.forEach((cb) => cb(storedMessage));
    }

    async getMessages(conversationId: string): Promise<StoredMessage[]> {
        return db.getMessages(conversationId);
    }

    async getConversations(): Promise<StoredConversation[]> {
        return db.getConversations();
    }

    async markConversationAsRead(conversationId: string): Promise<void> {
        await db.markConversationAsRead(conversationId);
        const messages = await db.getMessages(conversationId);

        if (!this.smashUser) throw new Error('SmashService not initialized');

        // Send read receipts for all messages
        const messageIds = messages
            .filter((m) => m.sender !== this.smashUser?.did)
            .map((m) => m.id);

        if (messageIds.length > 0) {
            await this.smashUser.ackMessagesRead(
                conversationId as DID,
                messageIds as sha256[],
            );
        }
    }

    onMessageReceived(callback: MessageCallback): void {
        this.messageCallbacks.add(callback);
    }

    onConversationUpdated(callback: ConversationCallback): void {
        this.conversationCallbacks.add(callback);
    }

    removeMessageCallback(callback: MessageCallback): void {
        this.messageCallbacks.delete(callback);
    }

    removeConversationCallback(callback: ConversationCallback): void {
        this.conversationCallbacks.delete(callback);
    }

    async close(): Promise<void> {
        if (this.smashUser) {
            await this.smashUser.close();
            this.smashUser = null;
        }
        await db.close();
    }
}

export const smashService = SmashService.getInstance();
