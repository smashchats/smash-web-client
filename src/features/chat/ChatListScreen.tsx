import { User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { type DIDDocument } from 'smash-node-lib';

import {
    ScreenHeaderLeftSlot,
    ScreenHeaderRightSlot,
} from '../../components/ScreenHeader';
import ScreenWrapper from '../../components/ScreenWrapper';
import { peerController } from '../../controllers/peerController';
import { useChatStore } from '../../hooks/useChatStore';
import { logger } from '../../lib/logger';
import { ConversationItem } from './ConversationItem';
import { NewConversationDialog } from './NewConversationDialog';
import './chatListScreen.css';

export default function ChatListScreen() {
    const navigate = useNavigate();
    const { conversations } = useChatStore();

    const handleQuickPhoto = (conversationId: string) => {
        navigate(`/camera?conversationId=${conversationId}`);
    };

    const handleCreateConversation = async (didDoc: DIDDocument) => {
        logger.info('Starting conversation creation process', {
            didId: didDoc.id,
        });
        const { conversation } = await peerController.newPeer(didDoc);
        navigate(`/chat/${conversation.id}`);
    };

    return (
        <ScreenWrapper title="Chats">
            <ScreenHeaderLeftSlot>
                <NewConversationDialog
                    onCreateConversation={handleCreateConversation}
                />
            </ScreenHeaderLeftSlot>
            <ScreenHeaderRightSlot>
                <User onClick={() => navigate('/profile')} />
            </ScreenHeaderRightSlot>
            <div className="chat-list-container">
                {conversations.length === 0 && (
                    <p className="empty-message">
                        No conversations yet. Start a new chat!
                    </p>
                )}

                <div className="conversation-list">
                    {conversations.map((conversation) => (
                        <ConversationItem
                            key={conversation.id}
                            conversation={conversation}
                            onQuickPhoto={handleQuickPhoto}
                        />
                    ))}
                </div>
            </div>
        </ScreenWrapper>
    );
}
