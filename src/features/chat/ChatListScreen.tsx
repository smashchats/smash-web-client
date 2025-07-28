import { User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { type DIDDocument } from 'smash-node-lib';

import {
    ScreenHeaderLeftSlot,
    ScreenHeaderRightSlot,
} from '@shared/components/ScreenHeader';
import ScreenWrapper from '@shared/components/ScreenWrapper';
import { peerService } from '@services/peerService';
import { useChatStore } from '@shared/hooks/useChatStore';
import { logger } from '../../shared/utils/logger';
import { ConversationItem } from './ConversationItem';
import { NewConversationDialog } from './NewConversationDialog';
import './chatListScreen.css';

export default function ChatListScreen() {
    const navigate = useNavigate();
    const { conversations } = useChatStore();

    const handleCreateConversation = async (didDoc: DIDDocument) => {
        logger.info('Starting conversation creation process', {
            didId: didDoc.id,
        });
        const { conversation } = await peerService.createPeerConversation(didDoc);
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
                        />
                    ))}
                </div>
            </div>
        </ScreenWrapper>
    );
}
