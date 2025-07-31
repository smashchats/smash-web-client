import { useChatStore } from '@hooks/useChatStore';
import { peerService } from '@services/peerService';
import { logger } from '@utils/logger';
import { useNavigate, useParams } from 'react-router-dom';
import { type DIDDocument } from 'smash-node-lib';

import './ChatListSidebar.css';
import { ConversationItem } from './ConversationItem';
import { NewConversationDialog } from './NewConversationDialog';

export function ChatListSidebar() {
    const navigate = useNavigate();
    const { id: activeConversationId } = useParams();
    const { conversations } = useChatStore();

    const handleQuickPhoto = (conversationId: string) => {
        navigate(`/camera?conversationId=${conversationId}`);
    };

    const handleCreateConversation = async (didDoc: DIDDocument) => {
        logger.info('Starting conversation creation process', {
            didId: didDoc.id,
        });
        const { conversation } =
            await peerService.createPeerConversation(didDoc);
        navigate(`/chat/${conversation.id}`);
    };

    return (
        <div className="chat-list-sidebar">
            <div className="chat-list-sidebar__header">
                <h2 className="chat-list-sidebar__title">Chats</h2>
                <NewConversationDialog
                    onCreateConversation={handleCreateConversation}
                />
            </div>

            <div className="chat-list-sidebar__content">
                {conversations.length === 0 ? (
                    <div className="chat-list-sidebar__empty">
                        <p>No conversations yet</p>
                        <p className="text-muted">Start a new chat!</p>
                    </div>
                ) : (
                    <div className="chat-list-sidebar__conversations">
                        {conversations.map((conversation) => (
                            <div
                                key={conversation.id}
                                className={`chat-list-sidebar__conversation-wrapper ${
                                    activeConversationId === conversation.id
                                        ? 'active'
                                        : ''
                                }`}
                            >
                                <ConversationItem
                                    conversation={conversation}
                                    onQuickPhoto={handleQuickPhoto}
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
