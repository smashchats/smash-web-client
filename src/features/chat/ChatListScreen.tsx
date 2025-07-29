import { peerService } from '@services/peerService';
import {
    ScreenHeaderLeftSlot,
    ScreenHeaderRightSlot,
} from '@shared/components/ScreenHeader';
import ScreenWrapper from '@shared/components/ScreenWrapper';
import { useChatStore } from '@shared/hooks/useChatStore';
import { UserRoundPen } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { type DIDDocument } from 'smash-node-lib';

import { logger } from '../../shared/utils/logger';
import { ConversationItem } from './ConversationItem';
import { NewConversationDialog } from './NewConversationDialog';
import './chatListScreen.css';

export default function ChatListScreen() {
    const navigate = useNavigate();
    const { conversations } = useChatStore();
    const [showUnreadOnly] = useState(false); // Hidden for now

    const handleCreateConversation = async (didDoc: DIDDocument) => {
        logger.info('Starting conversation creation process', {
            didId: didDoc.id,
        });
        const { conversation } =
            await peerService.createPeerConversation(didDoc);
        navigate(`/chat/${conversation.id}`);
    };

    const handleNavigateToSettings = () => {
        navigate('/profile');
    };

    // Filter conversations based on unread filter only
    const filteredConversations = conversations.filter((conversation) => {
        const matchesUnread = !showUnreadOnly || conversation.unreadCount > 0;
        return matchesUnread;
    });

    // Sort conversations: unread first, then by last message timestamp
    const sortedConversations = [...filteredConversations].sort((a, b) => {
        // First sort by unread status
        if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
        if (a.unreadCount === 0 && b.unreadCount > 0) return 1;

        // Then sort by last message timestamp
        const aTime = a.lastMessage?.timestamp || 0;
        const bTime = b.lastMessage?.timestamp || 0;
        return bTime - aTime;
    });

    return (
        <ScreenWrapper title="">
            <ScreenHeaderLeftSlot>
                <div className="chat-list-header-left">
                    <h1 className="chat-list-title">beta.smashchats.com</h1>
                </div>
            </ScreenHeaderLeftSlot>
            <ScreenHeaderRightSlot>
                <div className="chat-list-header-actions">
                    <button
                        onClick={handleNavigateToSettings}
                        className="chat-list-settings-button"
                        aria-label="Settings"
                    >
                        <UserRoundPen size={24} />
                    </button>
                    <NewConversationDialog
                        onCreateConversation={handleCreateConversation}
                    />
                </div>
            </ScreenHeaderRightSlot>

            <div className="chat-list-container">
                {/* Conversation List */}
                <div className="chat-list-content">
                    {sortedConversations.length === 0 ? (
                        <div className="chat-list-empty">
                            {showUnreadOnly ? (
                                <>
                                    <h3>No unread messages</h3>
                                    <p>You're all caught up!</p>
                                </>
                            ) : (
                                <>
                                    <h3>No conversations yet</h3>
                                    <p>Start a new chat to begin messaging</p>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="conversation-list">
                            {sortedConversations.map((conversation) => (
                                <ConversationItem
                                    key={conversation.id}
                                    conversation={conversation}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </ScreenWrapper>
    );
}
