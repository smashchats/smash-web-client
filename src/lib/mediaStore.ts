import Dexie, { type Table } from 'dexie';

export type MediaType = 'image' | 'video' | 'audio';
export interface Media {
    id?: number;
    type: MediaType;
    blob: Blob;
    timestamp: number;
    isPending?: boolean; // optional, used for "unsent" logic
}
class MediaDB extends Dexie {
    media!: Table<Media, number>;

    constructor() {
        super('MediaDB');
        this.version(1).stores({
            media: '++id,timestamp,type,isPending',
        });
    }
}

export const mediaDB = new MediaDB();

export async function getAllMedia(
    limit?: number,
    offset?: number,
): Promise<Media[]> {
    const query = mediaDB.media.orderBy('timestamp').reverse();

    if (limit !== undefined && offset !== undefined) {
        return query.offset(offset).limit(limit).toArray();
    } else if (limit !== undefined) {
        return query.limit(limit).toArray();
    }

    return query.toArray();
}

export async function getMediaByType(
    type: 'image' | 'video' | 'audio',
    limit?: number,
): Promise<Media[]> {
    const query = mediaDB.media.where('type').equals(type).reverse();

    if (limit !== undefined) {
        return query.limit(limit).toArray();
    }

    return query.toArray();
}

export async function getPendingMedia(): Promise<Media[]> {
    return mediaDB.media.where('isPending').equals(1).toArray();
}

export async function getMediaByDateRange(
    startDate: Date,
    endDate: Date,
    type?: 'image' | 'video' | 'audio',
): Promise<Media[]> {
    const startTimestamp = startDate.getTime();
    const endTimestamp = endDate.getTime();

    const query = mediaDB.media
        .where('timestamp')
        .between(startTimestamp, endTimestamp, true, true)
        .reverse();

    if (type) {
        // Filter by type after retrieving the items
        const results = await query.toArray();
        return results.filter((item) => item.type === type);
    }

    return query.toArray();
}

export async function saveMedia(media: Omit<Media, 'id'>): Promise<number> {
    return mediaDB.media.add(media);
}

export async function deleteMedia(id: number): Promise<void> {
    await mediaDB.media.delete(id);
}

export async function updateMedia(
    id: number,
    changes: Partial<Omit<Media, 'id'>>,
): Promise<number> {
    return mediaDB.media.update(id, changes);
}

export async function clearMedia(): Promise<void> {
    await mediaDB.media.clear();
}
