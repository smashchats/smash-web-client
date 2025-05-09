import { ArrowLeft, Check, Send } from 'lucide-react';
import { useEffect, useState } from 'react';

import { ScreenHeaderLeftSlot } from '../../components/ScreenHeader';
import ScreenWrapper from '../../components/ScreenWrapper';
import { useChatStore } from '../../hooks/useChatStore';
import type { SmashConversation } from '../../types/smash';

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
            <div style={styles.container}>
                <div style={styles.list}>
                    {conversations.map((conversation) => (
                        <div
                            key={conversation.id}
                            style={{
                                ...styles.discussionItem,
                                ...(selectedDiscussions.has(conversation.id)
                                    ? styles.selectedItem
                                    : {}),
                            }}
                            onClick={() => toggleSelection(conversation.id)}
                        >
                            <div style={styles.avatar}>
                                <div style={styles.defaultAvatar}>
                                    {conversation.title.charAt(0)}
                                </div>
                            </div>
                            <div style={styles.discussionInfo}>
                                <div style={styles.discussionName}>
                                    {conversation.title}
                                </div>
                                {conversation.lastMessage && (
                                    <div style={styles.lastMessage}>
                                        {typeof conversation.lastMessage
                                            .content === 'string'
                                            ? conversation.lastMessage.content
                                            : 'Media message'}
                                    </div>
                                )}
                            </div>
                            {selectedDiscussions.has(conversation.id) && (
                                <div style={styles.checkmark}>
                                    <Check size={20} color="#fff" />
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {selectedDiscussions.size > 0 && (
                    <div style={styles.bottomBar}>
                        <div style={styles.selectionCount}>
                            {selectedDiscussions.size} selected
                        </div>
                        <button style={styles.sendButton} onClick={handleSend}>
                            <span style={styles.sendText}>Send</span>
                            <Send size={18} />
                        </button>
                    </div>
                )}
            </div>
        </ScreenWrapper>
    );
}

const styles = {
    container: {
        height: '100%',
        display: 'flex',
        flexDirection: 'column' as const,
        backgroundColor: '#fff',
        zIndex: 20,
    },
    header: {
        padding: '16px 16px 8px 16px',
        marginTop: 40,
        borderBottom: '1px solid #eee',
    },
    headerText: {
        fontSize: 18,
        fontWeight: 600,
        margin: 0,
        color: '#333',
        textAlign: 'center' as const,
    },
    list: {
        flex: 1,
        overflowY: 'auto' as const,
        padding: '8px 0',
    },
    discussionItem: {
        display: 'flex',
        alignItems: 'center',
        padding: '12px 16px',
        borderBottom: '1px solid #eee',
        cursor: 'pointer',
    },
    selectedItem: {
        backgroundColor: 'rgba(0, 120, 255, 0.1)',
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: '50%',
        marginRight: 16,
        overflow: 'hidden',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
        objectFit: 'cover' as const,
    },
    defaultAvatar: {
        width: '100%',
        height: '100%',
        backgroundColor: '#ccc',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 20,
        fontWeight: 'bold' as const,
    },
    discussionInfo: {
        flex: 1,
    },
    discussionName: {
        fontSize: 16,
        fontWeight: 500,
        marginBottom: 4,
    },
    lastMessage: {
        fontSize: 14,
        color: '#666',
        whiteSpace: 'nowrap' as const,
        overflow: 'hidden',
        textOverflow: 'ellipsis' as const,
        maxWidth: '70vw',
    },
    checkmark: {
        width: 24,
        height: 24,
        borderRadius: '50%',
        backgroundColor: '#0078ff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 16,
    },
    bottomBar: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        backgroundColor: '#fff',
        borderTop: '1px solid #eee',
        height: 64,
    },
    selectionCount: {
        fontSize: 16,
        fontWeight: 500,
    },
    sendButton: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0078ff',
        color: '#fff',
        border: 'none',
        borderRadius: 24,
        padding: '10px 20px',
        gap: 8,
        fontWeight: 500,
        cursor: 'pointer',
    },
    sendText: {
        fontSize: 16,
    },
};
