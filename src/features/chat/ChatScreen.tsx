import { Suspense, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { DIDDocument, DIDString, IMMediaEmbedded } from 'smash-node-lib';

import ScreenWrapper from '../../components/ScreenWrapper';
import { messageController } from '../../controllers/messageController';
import { CURRENT_USER } from '../../lib/smeConfig';
import { useMessageStore } from '../../state/messageStore';
import { ChatHeader } from './ChatHeader';
import { ChatInput } from './ChatInput';
import { ChatMessage } from './ChatMessage';
import './ChatScreen.css';

interface PeerProfile {
    title: string;
    description: string;
    avatar: string;
}

export default function ChatScreen() {
    const navigate = useNavigate();
    const { id } = useParams();
    const rawMessages = useMessageStore(
        (s) => s.messagesByConversation[id as DIDString],
    );
    const messages = rawMessages ?? [];

    const [isProcessingMedia] = useState(false);
    const [peerDidDocument] = useState<DIDDocument | null>(null);
    const [peerProfile] = useState<PeerProfile | null>(null);
    const [peerProfiles] = useState<Record<string, PeerProfile>>({});

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatInputRef = useRef<HTMLTextAreaElement>(null);

    const handleCloseChat = () => {
        navigate('/chats');
    };

    useEffect(() => {
        if (!id) return;
        void messageController.loadMessages(id as DIDString);
    }, [id]);

    const sendMessage = (content: string | IMMediaEmbedded) => {
        messageController.sendMessage(id as DIDString, content);
    };

    return (
        <ScreenWrapper title="Chat" showBottomNav={false} backTo="/chats">
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                }}
            >
                {peerDidDocument && (
                    <ChatHeader
                        didDocument={peerDidDocument}
                        profile={peerProfile}
                        onClose={handleCloseChat}
                    />
                )}
                <div
                    className="messages-container"
                    style={{ flex: 1, overflowY: 'auto', padding: 16 }}
                >
                    {messages.map((message) => (
                        <Suspense
                            key={message.id}
                            fallback={<div>Loading Chat Message...</div>}
                        >
                            <ChatMessage
                                message={message}
                                isOwnMessage={message.sender === CURRENT_USER}
                                peerProfile={peerProfiles[message.sender]}
                            />
                        </Suspense>
                    ))}
                    <div ref={messagesEndRef} />
                </div>
                <ChatInput
                    ref={chatInputRef}
                    onSendMessage={sendMessage}
                    isLoading={isProcessingMedia}
                />
            </div>
        </ScreenWrapper>
    );
}
