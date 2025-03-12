export type MessageStatus = 'sent' | 'delivered' | 'read' | 'failed' | 'error';

export interface BaseMessage {
    id: string;
    conversationId: string;
    content: string;
    sender: string;
    status: MessageStatus;
}

export interface StoredMessage extends BaseMessage {
    timestamp: string;
}

export interface SmashMessage extends BaseMessage {
    timestamp: Date;
}

export interface BaseConversation {
    id: string;
    title: string;
    unreadCount: number;
    participants: string[];
    type: 'direct' | 'group';
}

export interface StoredConversation extends BaseConversation {
    lastMessage?: StoredMessage;
}

export interface SmashConversation extends BaseConversation {
    lastMessage?: SmashMessage;
}

export interface SMEConfig {
    url: string;
    smePublicKey: string;
}

export interface Profile {
    title: string;
    description: string;
    avatar: string;
}

export interface SmashService {
    getConversations(): Promise<StoredConversation[]>;
    getMessages(conversationId: string): Promise<StoredMessage[]>;
    updateProfile(profile: Profile): Promise<void>;
    updateSMEConfig(config: SMEConfig): Promise<void>;
    onMessageReceived(callback: (message: StoredMessage) => void): void;
    onConversationUpdated(
        callback: (conversation: StoredConversation) => void,
    ): void;
}

export interface SmashUser {
    id: string;
    username: string;
    displayName: string;
    status: 'online' | 'offline' | 'away';
    lastSeen?: Date;
}

export interface SmashError {
    code: string;
    message: string;
    details?: unknown;
}
