import { ArrowLeft, Check, Send } from 'lucide-react';
import { useEffect, useState } from 'react';

import { ScreenHeaderLeftSlot } from '../../components/ScreenHeader';
import ScreenWrapper from '../../components/ScreenWrapper';
import { useChatStore } from '../../hooks/useChatStore';
import type { SmashConversation } from '../../types/smash';
import './DiscussionSelection.css';

type DiscussionSelectionProps = {
    onSend: (selectedIds: string[]) => void;
    onBack: () => void;
    conversation: SmashConversation | null;
};

export default function DiscussionSelection({
    onSend,
    onBack,
    conversation,
}: Readonly<DiscussionSelectionProps>) {
    const [selectedDiscussions, setSelectedDiscussions] = useState<Set<string>>(
        new Set(),
    );

    const { conversations } = useChatStore();

    useEffect(() => {
        if (conversation) {
            setSelectedDiscussions(new Set([conversation.id]));
        }
    }, [conversation]);

    const toggleSelection = (id: string) => {
        const newSelection = new Set(selectedDiscussions);
        if (newSelection.has(id)) {
            newSelection.delete(id);
        } else {
            newSelection.add(id);
        }
        setSelectedDiscussions(newSelection);
    };

    const handleSend = () => {
        if (selectedDiscussions.size > 0) {
            onSend(Array.from(selectedDiscussions));
        }
    };

    return (
        <ScreenWrapper title="Select Discussions" showBottomNav={false}>
            <ScreenHeaderLeftSlot>
                <ArrowLeft onClick={onBack} style={{ cursor: 'pointer' }} />
            </ScreenHeaderLeftSlot>
            <div className="discussion-selection-container">
                <div className="discussion-selection-list">
                    {conversations.map((conversation) => (
                        <div
                            key={conversation.id}
                            className={`discussion-item ${
                                selectedDiscussions.has(conversation.id)
                                    ? 'selected'
                                    : ''
                            }`}
                            onClick={() => toggleSelection(conversation.id)}
                        >
                            <div className="discussion-avatar">
                                <div className="discussion-default-avatar">
                                    {conversation.title.charAt(0)}
                                </div>
                            </div>
                            <div className="discussion-info">
                                <div className="discussion-name">
                                    {conversation.title}
                                </div>
                                {conversation.lastMessage && (
                                    <div className="discussion-last-message">
                                        {typeof conversation.lastMessage
                                            .content === 'string'
                                            ? conversation.lastMessage.content
                                            : 'Media message'}
                                    </div>
                                )}
                            </div>
                            {selectedDiscussions.has(conversation.id) && (
                                <div className="discussion-checkmark">
                                    <Check size={20} color="#fff" />
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {selectedDiscussions.size > 0 && (
                    <div className="discussion-bottom-bar">
                        <div className="discussion-bottom-bar-container">
                            <div className="discussion-selection-count">
                                {selectedDiscussions.size} selected
                            </div>

                            <button
                                className="discussion-send-button"
                                onClick={handleSend}
                            >
                                <span className="discussion-send-text">
                                    Send
                                </span>
                                <Send size={18} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </ScreenWrapper>
    );
}
