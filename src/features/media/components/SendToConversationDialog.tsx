import {
    type MediaShareTarget,
    type ProcessedMedia,
} from '@services/mediaService';
import { Check, Send, User, X } from 'lucide-react';
import { useCallback, useState } from 'react';

import { useChatStore } from '../../../hooks/useChatStore';
import './SendToConversationDialog.css';

interface SendToConversationDialogProps {
    media: ProcessedMedia[];
    onSend: (targets: MediaShareTarget[]) => void;
    onClose: () => void;
    isOpen: boolean;
}

export function SendToConversationDialog({
    media,
    onSend,
    onClose,
    isOpen,
}: Readonly<SendToConversationDialogProps>) {
    const [selectedConversations, setSelectedConversations] = useState<
        Set<string>
    >(new Set());
    const { conversations, getPeerProfile } = useChatStore();

    const handleToggleConversation = useCallback((conversationId: string) => {
        setSelectedConversations((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(conversationId)) {
                newSet.delete(conversationId);
            } else {
                newSet.add(conversationId);
            }
            return newSet;
        });
    }, []);

    const handleSend = useCallback(() => {
        if (selectedConversations.size === 0) return;

        const targets: MediaShareTarget[] = Array.from(
            selectedConversations,
        ).map((conversationId) => {
            const conversation = conversations.find(
                (c) => c.id === conversationId,
            );
            // For 1-on-1 conversations, the recipient is typically the other participant
            const recipientId =
                conversation?.participants.find((p) => p !== 'You') ||
                conversationId;

            return {
                conversationId,
                recipientId,
            };
        });

        onSend(targets);
        setSelectedConversations(new Set());
    }, [selectedConversations, conversations, onSend]);

    const handleClose = useCallback(() => {
        setSelectedConversations(new Set());
        onClose();
    }, [onClose]);

    if (!isOpen) return null;

    return (
        <div className="send-dialog-overlay">
            <div className="send-dialog-container">
                {/* Header */}
                <div className="send-dialog-header">
                    <div className="send-dialog-title">
                        Send to conversations
                        {media.length > 1 && (
                            <span className="send-dialog-media-count">
                                ({media.length} items)
                            </span>
                        )}
                    </div>
                    <button
                        className="send-dialog-close"
                        onClick={handleClose}
                        aria-label="Close dialog"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Media preview strip */}
                <div className="send-dialog-media-preview">
                    {media.slice(0, 5).map((mediaItem) => (
                        <div
                            key={mediaItem.id}
                            className="send-dialog-media-item"
                        >
                            <MediaPreviewThumbnail media={mediaItem} />
                        </div>
                    ))}
                    {media.length > 5 && (
                        <div className="send-dialog-media-more">
                            +{media.length - 5}
                        </div>
                    )}
                </div>

                {/* Conversation list */}
                <div className="send-dialog-content">
                    <div className="send-dialog-subtitle">
                        Select conversations ({selectedConversations.size}{' '}
                        selected)
                    </div>

                    <div className="send-dialog-conversation-list">
                        {conversations.length === 0 ? (
                            <div className="send-dialog-empty">
                                <span>No conversations available</span>
                            </div>
                        ) : (
                            conversations.map((conversation) => {
                                const isSelected = selectedConversations.has(
                                    conversation.id,
                                );
                                const peerProfile = getPeerProfile(
                                    conversation.participants[0],
                                );

                                return (
                                    <button
                                        key={conversation.id}
                                        className={`conversation-select-item ${
                                            isSelected
                                                ? 'conversation-select-item--selected'
                                                : ''
                                        }`}
                                        onClick={() =>
                                            handleToggleConversation(
                                                conversation.id,
                                            )
                                        }
                                    >
                                        <div className="conversation-select-avatar">
                                            {peerProfile?.avatar ? (
                                                <img
                                                    src={peerProfile.avatar}
                                                    alt=""
                                                    className="conversation-avatar-image"
                                                />
                                            ) : (
                                                <div className="conversation-avatar-placeholder">
                                                    <User className="w-4 h-4" />
                                                </div>
                                            )}
                                        </div>

                                        <div className="conversation-select-info">
                                            <div className="conversation-select-name">
                                                {conversation.title ||
                                                    peerProfile?.title ||
                                                    'Unknown'}
                                            </div>
                                            {conversation.lastMessage && (
                                                <div className="conversation-select-preview">
                                                    {conversation.lastMessage
                                                        .type === 'im.chat.text'
                                                        ? conversation
                                                              .lastMessage
                                                              .content
                                                        : 'Media message'}
                                                </div>
                                            )}
                                        </div>

                                        <div
                                            className={`conversation-select-checkbox ${
                                                isSelected
                                                    ? 'conversation-select-checkbox--checked'
                                                    : ''
                                            }`}
                                        >
                                            {isSelected && (
                                                <Check className="w-3 h-3" />
                                            )}
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="send-dialog-actions">
                    <button
                        className="btn-secondary btn-size-md"
                        onClick={handleClose}
                    >
                        Cancel
                    </button>
                    <button
                        className="btn-primary btn-size-md"
                        onClick={handleSend}
                        disabled={selectedConversations.size === 0}
                    >
                        <Send className="w-4 h-4" />
                        Send to {selectedConversations.size} conversation
                        {selectedConversations.size !== 1 ? 's' : ''}
                    </button>
                </div>
            </div>
        </div>
    );
}

interface MediaPreviewThumbnailProps {
    media: ProcessedMedia;
}

function MediaPreviewThumbnail({
    media,
}: Readonly<MediaPreviewThumbnailProps>) {
    switch (media.type) {
        case 'image':
            return (
                <img
                    src={media.preview}
                    alt="Media thumbnail"
                    className="media-thumb-image"
                />
            );

        case 'video':
            return (
                <div className="media-thumb-video">
                    <video
                        src={media.preview}
                        className="media-thumb-image"
                        muted
                    />
                    <div className="media-thumb-overlay">
                        <div className="media-thumb-play-icon">▶</div>
                    </div>
                </div>
            );

        case 'audio':
            return (
                <div className="media-thumb-audio">
                    <div className="media-thumb-audio-icon">♪</div>
                </div>
            );

        default:
            return (
                <div className="media-thumb-unknown">
                    <span>?</span>
                </div>
            );
    }
}
