import { DIDDocument } from 'smash-node-lib';

import { SmashMessage } from '../../lib/types';
import { ChatHeader } from './ChatHeader';
import { ChatMessage } from './ChatMessage';

interface ChatMessagesProps {
    messages: SmashMessage[];
    messagesRef: React.RefObject<HTMLDivElement>;
    didDocument: DIDDocument | null;
    peerProfile?: {
        title: string;
        description: string;
        avatar: string;
    } | null;
    identity: string | null;
    onClose?: () => void;
}

export function ChatMessages({
    messages,
    messagesRef,
    didDocument,
    peerProfile,
    identity,
    onClose,
}: ChatMessagesProps) {
    return (
        <div className="messages-container" ref={messagesRef}>
            {didDocument && (
                <ChatHeader
                    didDocument={didDocument}
                    profile={peerProfile}
                    onClose={onClose}
                />
            )}
            <div className="messages-content">
                {messages.map((message) => (
                    <ChatMessage
                        key={message.id}
                        message={message}
                        peerProfile={peerProfile}
                        isOwnMessage={message.sender === identity}
                    />
                ))}
            </div>
        </div>
    );
}
