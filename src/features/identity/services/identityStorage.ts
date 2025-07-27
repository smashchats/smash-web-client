import { db } from '@src/services/db';
import { logger } from '@src/shared/utils/logger';

export async function loadStoredIdentity() {
    logger.info('Loading stored identity from DB');
    return db.getIdentity();
}

export async function clearStoredIdentity(): Promise<void> {
    await db.deleteDatabase();
}
