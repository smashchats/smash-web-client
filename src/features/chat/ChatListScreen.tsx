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
// Tailwind styles are now applied directly via className

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
            <div className="flex flex-col h-full overflow-y-auto p-2">
                {conversations.length === 0 && (
                    <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-10">
                        No conversations yet. Start a new chat!
                    </p>
                )}

                <div className="flex flex-col divide-y divide-gray-200 dark:divide-gray-700">
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
