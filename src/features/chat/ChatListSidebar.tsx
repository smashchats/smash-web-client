import { useNavigate, useParams } from 'react-router-dom';
import { type DIDDocument } from 'smash-node-lib';

import { peerService } from '@services/peerService';
import { useChatStore } from '@shared/hooks/useChatStore';
import { logger } from '@shared/utils/logger';
import { ConversationItem } from './ConversationItem';
import { NewConversationDialog } from './NewConversationDialog';
// Tailwind classes are used directly

export function ChatListSidebar() {
    const navigate = useNavigate();
    const { id: activeConversationId } = useParams();
    const { conversations } = useChatStore();

    const handleCreateConversation = async (didDoc: DIDDocument) => {
        logger.info('Starting conversation creation process', {
            didId: didDoc.id,
        });
        const { conversation } = await peerService.createPeerConversation(didDoc);
        navigate(`/chat/${conversation.id}`);
    };

    return (
        <div className="flex flex-col w-80 border-r border-gray-200 dark:border-gray-700 h-full">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold">Chats</h2>
                <NewConversationDialog
                    onCreateConversation={handleCreateConversation}
                />
            </div>
            
            <div className="flex-1 overflow-y-auto">
                {conversations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400 p-4">
                        <p>No conversations yet</p>
                        <p className="text-sm">Start a new chat!</p>
                    </div>
                ) : (
                    <div className="flex flex-col divide-y divide-gray-200 dark:divide-gray-700">
                        {conversations.map((conversation) => (
                            <div
                                key={conversation.id}
                                className={`${activeConversationId === conversation.id ? 'bg-gray-100 dark:bg-gray-800' : ''}`}
                            >
                                <ConversationItem
                                    conversation={conversation}
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
} 
