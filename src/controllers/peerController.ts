import {
    type DIDDocument,
    type DIDString,
    type IMDIDDocumentMessage,
    type IMProfileMessage,
    SmashMessaging,
} from 'smash-node-lib';

import { useChatStore } from '../hooks/useChatStore';
import { db } from '../lib/db';
import { logger } from '../lib/logger';
import { CURRENT_USER } from '../lib/smeConfig';
import { type StoredProfile } from '../lib/types';
import type { SmashConversation } from '../types/smash';

export const peerController = {
    async getPeerProfile(did: DIDString) {
        const peerProfile = await db.getPeerProfile(did);
        return peerProfile;
    },

    async newPeer(didDoc: DIDDocument) {
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
            useChatStore.getState().addNewConversation(conversation);

            logger.debug('Resolving DID document in SmashMessaging', {
                didId: didDoc.id,
            });
            await SmashMessaging.resolve(didDoc);

            logger.info('Conversation creation completed successfully', {
                conversationId: conversation.id,
            });

            return {
                conversation,
            };
        } catch (error) {
            logger.error('Failed to create conversation', error);
            throw error;
        }
    },

    async initAllPeers() {
        const didDocs = await db.getAllDIDDocuments();
        console.group('initAllPeers');
        for (const doc of didDocs) {
            console.debug('init-ing', doc);
            await SmashMessaging.resolve(doc);
        }
        console.groupEnd();
    },

    async handleIncomingDIDDocument(
        senderId: DIDString,
        message: IMDIDDocumentMessage,
    ) {
        console.log('handleIncomingDIDDocument', senderId, message);
        const didDocument = message.data;
        try {
            logger.debug('Handling incoming DID document', {
                didId: didDocument.id,
            });
            await db.didDocuments.put(didDocument);
            await SmashMessaging.resolve(didDocument);
            // Optionally, notify UI or other parts of the app if needed
            logger.info('Successfully processed incoming DID document', {
                didId: didDocument.id,
            });
        } catch (error) {
            logger.error('Failed to handle incoming DID document', {
                error,
                didId: didDocument.id,
            });
            // Rethrow or handle as appropriate for your application's error strategy
            throw error;
        }
    },

    async handleIncomingProfile(
        senderId: DIDString,
        message: IMProfileMessage,
    ) {
        console.log('handle incoming profile', senderId, message);
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
            logger.info('Successfully processed incoming profile for DID', {
                did: profile.did,
            });
            // Optionally, notify UI or other parts of the app if needed
        } catch (error) {
            logger.error('Failed to handle incoming profile', {
                error,
                profile,
            });
            // Rethrow or handle as appropriate for your application's error strategy
            throw error;
        }
    },
};
