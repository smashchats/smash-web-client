import {
    type DIDDocument,
    type DIDString,
    SmashMessaging,
} from 'smash-node-lib';

import { useChatStore } from '../hooks/useChatStore';
import { db } from '../lib/db';
import { logger } from '../lib/logger';
import { CURRENT_USER } from '../lib/smeConfig';
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
        for (const doc of didDocs) {
            await SmashMessaging.resolve(doc);
        }
    },
};
