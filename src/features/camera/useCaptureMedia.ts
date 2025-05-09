import { useCallback } from 'react';

import { type Media, mediaDB } from '../../lib/mediaStore';

export function useCaptureMedia() {
    const saveMedia = useCallback(async (blob: Blob, type: Media['type']) => {
        const entry: Media = {
            blob,
            type,
            timestamp: Date.now(),
        };
        await mediaDB.media.add(entry);
    }, []);

    return { saveMedia };
}
