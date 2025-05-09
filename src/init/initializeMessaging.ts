import { messageController } from '../controllers/messageController';
import { smashService } from '../lib/smash/smash-service';

export function initializeMessaging() {
    smashService.onMessageReceived(messageController.handleIncomingMessage);
    smashService.onMessageStatusUpdated(
        messageController.handleMessageStatusUpdate,
    );
}
