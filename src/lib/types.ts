import { EmbeddedBase64Media, MessageStatus } from 'smash-node-lib';

interface BaseMessage {
    id: string;
    conversationId: string;
    sender: string;
    status: MessageStatus;
    timestamp: number; // Unix timestamp in milliseconds
}

export interface TextMessage extends BaseMessage {
    type: 'im.chat.text';
    content: string;
}

export interface MediaMessage extends BaseMessage {
    type: 'im.chat.media.embedded';
    content: EmbeddedBase64Media;
}

export type SmashMessage = TextMessage | MediaMessage;

export interface SmashConversation {
    id: string;
    title: string;
    lastMessage?: SmashMessage;
    unreadCount: number;
    participants: string[];
    type: 'direct' | 'group';
    updatedAt: number; // Unix timestamp in milliseconds
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
    getConversations(): Promise<SmashConversation[]>;
    getMessages(conversationId: string): Promise<SmashMessage[]>;
    updateProfile(profile: Profile): Promise<void>;
    updateSMEConfig(config: SMEConfig): Promise<void>;
    onMessageReceived(callback: (message: SmashMessage) => void): void;
    onConversationUpdated(
        callback: (conversation: SmashConversation) => void,
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
