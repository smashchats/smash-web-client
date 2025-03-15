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
import { SmashMessage } from './types';

export type MessageCallback = (message: SmashMessage) => void;
export type ConversationCallback = (conversation: StoredConversation) => void;
export type StatusCallback = (
    messageId: string,
    status: SmashMessage['status'],
) => void;

class SmashService {
    private static instance: SmashService;
    private messageCallbacks: Set<MessageCallback> = new Set();
    private conversationCallbacks: Set<ConversationCallback> = new Set();
    private statusCallbacks: Set<StatusCallback> = new Set();
    private smashUser: SmashUser | null = null;

    private constructor() {
        // We don't need to set up event listeners in constructor
        // They will be set up when a user is initialized
    }

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

        // Set up status listener
        this.smashUser.on(
            'status',
            (status: MessageStatus, messageIds: sha256[]) => {
                messageIds.forEach((messageId) => {
                    const mappedStatus = this.mapMessageStatus(status);
                    void db.updateMessageStatus(messageId, mappedStatus);
                    this.statusCallbacks.forEach((callback) =>
                        callback(messageId, mappedStatus),
                    );
                });
            },
        );
    }

    private mapMessageStatus(status: MessageStatus): StoredMessage['status'] {
        switch (status) {
            case 'received':
            case 'delivered':
                return 'delivered';
            case 'read':
                return 'read';
            default:
                return 'error';
        }
    }

    private async handleIncomingMessage(
        senderId: DIDString,
        message: IMProtoMessage,
    ): Promise<void> {
        if (!this.smashUser) throw new Error('SmashService not initialized');

        console.log('📨 Handling incoming message:', { senderId, message });

        const storedMessage: StoredMessage = {
            id: message.sha256 || crypto.randomUUID(),
            content: message.data as string,
            sender: senderId,
            conversationId: senderId,
            timestamp: message.timestamp || new Date().toISOString(),
            status: 'delivered',
        };

        console.log('💾 Storing message:', storedMessage);

        // Add message to database - this will also create a conversation if it doesn't exist
        await db.addMessage(storedMessage);

        // Get the conversation to notify UI about potential new conversation
        const conversation = await db.getConversation(senderId);
        if (conversation) {
            console.log('📬 Notifying about conversation:', conversation);
            this.conversationCallbacks.forEach((callback) => callback(conversation));
        }

        const smashMessage: SmashMessage = {
            ...storedMessage,
            timestamp: new Date(storedMessage.timestamp),
        };
        console.log('📲 Notifying about message:', smashMessage);
        this.messageCallbacks.forEach((cb) => cb(smashMessage));

        // Mark message as received if it has a hash
        if (message.sha256) {
            console.log('✅ Acknowledging message:', message.sha256);
            await this.smashUser.ackMessagesRead(senderId, [message.sha256]);
        }
    }

    async sendMessage(
        conversationId: DIDString,
        content: string,
    ): Promise<SmashMessage> {
        if (!this.smashUser) throw new Error('SmashService not initialized');

        console.log('📤 Sending message:', { conversationId, content });

        // Create message
        const message = new IMText(content);
        const sent = await this.smashUser.send(conversationId as DID, message);

        const smashMessage: SmashMessage = {
            id: sent.sha256!,
            conversationId,
            content,
            sender: 'You',
            timestamp: new Date(sent.timestamp),
            status: 'sent',
        };

        console.log('💾 Storing sent message:', smashMessage);

        // Store in database
        await db.addMessage({
            ...smashMessage,
            timestamp: smashMessage.timestamp.toISOString(),
            status: 'sent',
        });

        return smashMessage;
    }

    async getMessages(conversationId: string): Promise<SmashMessage[]> {
        const messages = await db.getMessages(conversationId);
        return messages.map((msg) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
        }));
    }

    async getConversations(): Promise<StoredConversation[]> {
        return db.getConversations();
    }

    onMessageReceived(callback: MessageCallback): void {
        this.messageCallbacks.add(callback);
    }

    onConversationUpdated(callback: ConversationCallback): void {
        this.conversationCallbacks.add(callback);
    }

    onMessageStatusUpdated(callback: StatusCallback): void {
        this.statusCallbacks.add(callback);
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
