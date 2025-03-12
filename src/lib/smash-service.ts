import { SmashConversation, SmashMessage } from './types';

// Mock data
const MOCK_CONVERSATIONS: SmashConversation[] = [
    {
        id: '1',
        participants: ['Alice', 'You'],
        type: 'direct',
        unreadCount: 2,
        lastMessage: {
            id: 'msg1',
            content: 'Hey, how are you?',
            sender: 'Alice',
            timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
            status: 'delivered',
        },
    },
    {
        id: '2',
        participants: ['Bob', 'You'],
        type: 'direct',
        unreadCount: 0,
        lastMessage: {
            id: 'msg2',
            content: 'See you tomorrow!',
            sender: 'You',
            timestamp: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
            status: 'read',
        },
    },
    {
        id: '3',
        participants: ['Alice', 'Bob', 'Charlie', 'You'],
        type: 'group',
        unreadCount: 5,
        lastMessage: {
            id: 'msg3',
            content: "Who's up for lunch?",
            sender: 'Charlie',
            timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
            status: 'delivered',
        },
    },
];

const MOCK_MESSAGES: Record<string, SmashMessage[]> = {
    '1': [
        {
            id: 'msg1-1',
            content: 'Hi there!',
            sender: 'You',
            timestamp: new Date(Date.now() - 1000 * 60 * 10),
            status: 'read',
        },
        {
            id: 'msg1-2',
            content: 'Hey, how are you?',
            sender: 'Alice',
            timestamp: new Date(Date.now() - 1000 * 60 * 5),
            status: 'delivered',
        },
    ],
    '2': [
        {
            id: 'msg2-1',
            content: 'Are we still on for tomorrow?',
            sender: 'Bob',
            timestamp: new Date(Date.now() - 1000 * 60 * 65),
            status: 'read',
        },
        {
            id: 'msg2-2',
            content: 'Yes, absolutely!',
            sender: 'You',
            timestamp: new Date(Date.now() - 1000 * 60 * 62),
            status: 'read',
        },
        {
            id: 'msg2-3',
            content: 'See you tomorrow!',
            sender: 'You',
            timestamp: new Date(Date.now() - 1000 * 60 * 60),
            status: 'read',
        },
    ],
    '3': [
        {
            id: 'msg3-1',
            content: "Who's up for lunch?",
            sender: 'Charlie',
            timestamp: new Date(Date.now() - 1000 * 60 * 30),
            status: 'delivered',
        },
    ],
};

type MessageCallback = (message: SmashMessage) => void;
type ConversationCallback = (conversation: SmashConversation) => void;

class SmashService {
    private static instance: SmashService;
    private messageCallbacks: MessageCallback[] = [];
    private conversationCallbacks: ConversationCallback[] = [];
    private conversations: SmashConversation[] = MOCK_CONVERSATIONS;
    private messages: Record<string, SmashMessage[]> = MOCK_MESSAGES;

    private constructor() {}

    static getInstance(): SmashService {
        if (!SmashService.instance) {
            SmashService.instance = new SmashService();
        }
        return SmashService.instance;
    }

    async getConversations(): Promise<SmashConversation[]> {
        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 500));
        return this.conversations;
    }

    async getMessages(conversationId: string): Promise<SmashMessage[]> {
        await new Promise((resolve) => setTimeout(resolve, 300));
        return this.messages[conversationId] || [];
    }

    async sendMessage(
        conversationId: string,
        content: string,
    ): Promise<SmashMessage> {
        await new Promise((resolve) => setTimeout(resolve, 300));

        const newMessage: SmashMessage = {
            id: `msg-${Date.now()}`,
            content,
            sender: 'You',
            timestamp: new Date(),
            status: 'sent',
        };

        // Update messages
        this.messages[conversationId] = [
            ...(this.messages[conversationId] || []),
            newMessage,
        ];

        // Update conversation last message
        const conversation = this.conversations.find(
            (c) => c.id === conversationId,
        );
        if (conversation) {
            conversation.lastMessage = newMessage;
            // Notify conversation update
            this.conversationCallbacks.forEach((cb) => cb(conversation));
        }

        // Simulate message status updates
        setTimeout(() => {
            newMessage.status = 'delivered';
            this.messageCallbacks.forEach((cb) => cb(newMessage));
        }, 1000);

        setTimeout(() => {
            newMessage.status = 'read';
            this.messageCallbacks.forEach((cb) => cb(newMessage));
        }, 2000);

        return newMessage;
    }

    onMessageReceived(callback: MessageCallback): void {
        this.messageCallbacks.push(callback);
    }

    onConversationUpdated(callback: ConversationCallback): void {
        this.conversationCallbacks.push(callback);
    }

    // Simulate receiving a message (for testing)
    async simulateIncomingMessage(
        conversationId: string,
        content: string,
        sender: string,
    ): Promise<void> {
        const newMessage: SmashMessage = {
            id: `msg-${Date.now()}`,
            content,
            sender,
            timestamp: new Date(),
            status: 'delivered',
        };

        this.messages[conversationId] = [
            ...(this.messages[conversationId] || []),
            newMessage,
        ];

        const conversation = this.conversations.find(
            (c) => c.id === conversationId,
        );
        if (conversation) {
            conversation.lastMessage = newMessage;
            conversation.unreadCount += 1;
            this.conversationCallbacks.forEach((cb) => cb(conversation));
        }

        this.messageCallbacks.forEach((cb) => cb(newMessage));
    }
}

export const smashService = SmashService.getInstance();
