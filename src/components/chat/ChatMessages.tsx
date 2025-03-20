import { DIDDocument } from 'smash-node-lib';

import { StoredMessage } from '../../lib/types';
import { ChatHeader } from './ChatHeader';
import { ChatMessage } from './ChatMessage';

interface ChatMessagesProps {
    messages: StoredMessage[];
    messagesRef: React.RefObject<HTMLDivElement>;
    didDocument: DIDDocument | null;
    peerProfile?: {
        title: string;
        description: string;
        avatar: string;
    } | null;
    identity: string | null;
}

export function ChatMessages({
    messages,
    messagesRef,
    didDocument,
    peerProfile,
    identity,
}: ChatMessagesProps) {
    return (
        <div className="messages-container" ref={messagesRef}>
            {didDocument && (
                <ChatHeader didDocument={didDocument} profile={peerProfile} />
            )}
            <div className="messages-content">
                {messages.map((message) => (
                    <ChatMessage
                        key={message.id}
                        message={{
                            ...message,
                            timestamp: new Date(message.timestamp),
                        }}
                        peerProfile={peerProfile}
                        isOwnMessage={message.sender === identity}
                    />
                ))}
            </div>
        </div>
    );
}
