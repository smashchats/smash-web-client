import { CURRENT_USER } from '@app/config/sme';
import { useChatStore } from '@hooks/useChatStore';
import { db } from '@services/db';
import { type StoredProfile } from '@smash/db';
import type { SmashConversation } from '@smash/smash';
import { logger } from '@utils/logger';
import {
    type DIDDocument,
    type DIDString,
    type IMDIDDocumentMessage,
    type IMProfileMessage,
    SmashMessaging,
} from 'smash-node-lib';

export class PeerService {
    /**
     * Get peer profile from database
     */
    async getPeerProfile(did: DIDString): Promise<StoredProfile | undefined> {
        return db.getPeerProfile(did);
    }

    /**
     * Get all peer profiles from database
     */
    async getAllPeerProfiles(): Promise<Record<string, StoredProfile>> {
        const profiles: Record<string, StoredProfile> = {};
        const didDocs = await db.getAllDIDDocuments();

        for (const doc of didDocs) {
            const profile = await db.getPeerProfile(doc.id);
            if (profile) {
                profiles[doc.id] = profile;
            }
        }

        return profiles;
    }

    /**
     * Create a new peer conversation from DID document
     */
    async createPeerConversation(
        didDoc: DIDDocument,
    ): Promise<{ conversation: SmashConversation }> {
        try {
            const conversation: SmashConversation = {
                id: didDoc.id,
                title: `Chat with ${didDoc.id.slice(0, 8)}...`,
                participants: [CURRENT_USER, didDoc.id],
                type: 'direct',
                unreadCount: 0,
                updatedAt: Date.now(),
                lastMessage: undefined,
            };

            logger.debug('Adding conversation to database', {
                conversationId: conversation.id,
            });

            await db.addConversation(conversation);
            await db.addDIDDocument(didDoc);

            logger.debug('Resolving DID document in SmashMessaging', {
                didId: didDoc.id,
            });
            await SmashMessaging.resolve(didDoc);

            // IMMEDIATELY update live state - add conversation to chat store
            const chatStore = useChatStore.getState();
            chatStore.addNewConversation(conversation);

            logger.info('Conversation creation completed successfully', {
                conversationId: conversation.id,
            });

            return { conversation };
        } catch (error) {
            logger.error('Failed to create conversation', error);
            throw error;
        }
    }

    /**
     * Initialize all known peers in SmashMessaging
     */
    async initAllPeers(): Promise<void> {
        const didDocs = await db.getAllDIDDocuments();
        logger.info('Initializing all peers', { count: didDocs.length });

        for (const doc of didDocs) {
            logger.debug('Initializing peer', { didId: doc.id });
            await SmashMessaging.resolve(doc);
        }

        logger.info('All peers initialized successfully');
    }

    /**
     * Handle incoming DID document from peer
     */
    async handleIncomingDIDDocument(
        senderId: DIDString,
        message: IMDIDDocumentMessage,
    ): Promise<void> {
        const didDocument = message.data;
        try {
            logger.debug('Handling incoming DID document', {
                didId: didDocument.id,
            });
            await db.didDocuments.put(didDocument);
            await SmashMessaging.resolve(didDocument);

            logger.info('Successfully processed incoming DID document', {
                didId: didDocument.id,
            });
        } catch (error) {
            logger.error('Failed to handle incoming DID document', {
                error,
                didId: didDocument.id,
            });
            throw error;
        }
    }

    /**
     * Handle incoming profile from peer
     * This method includes UI store update callbacks that should be set up via hooks
     */
    async handleIncomingProfile(
        senderId: DIDString,
        message: IMProfileMessage,
        onProfileUpdate?: (peerId: string, profile: StoredProfile) => void,
    ): Promise<void> {
        const profile = message.data;
        try {
            logger.debug('Handling incoming profile', { profile });

            if (!profile.did) {
                logger.warn('Incoming profile is missing a DID identifier', {
                    did: profile.did,
                    profile,
                });
                return;
            }

            const storedProfile: StoredProfile = {
                title: profile.title,
                description: profile.description,
                avatar: profile.avatar,
            };

            await db.setPeerProfile(profile.did as DIDString, storedProfile);

            // Call UI update callback if provided
            onProfileUpdate?.(profile.did as DIDString, storedProfile);

            logger.info('Successfully processed incoming profile for DID', {
                did: profile.did,
            });
        } catch (error) {
            logger.error('Failed to handle incoming profile', {
                error,
                profile,
            });
            throw error;
        }
    }
}

// Export singleton instance
export const peerService = new PeerService();
