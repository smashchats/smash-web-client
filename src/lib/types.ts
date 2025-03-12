export interface SmashMessage {
    id: string;
    content: string;
    sender: string;
    timestamp: Date;
    status: 'sent' | 'delivered' | 'read' | 'failed';
}

export interface SmashConversation {
    id: string;
    participants: string[];
    lastMessage?: SmashMessage;
    unreadCount: number;
    type: 'direct' | 'group';
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
