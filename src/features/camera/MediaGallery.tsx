import { useEffect, useState } from 'react';

import { type Media, mediaDB } from '../../lib/mediaStore';

export default function MediaGallery() {
    const [mediaItems, setMediaItems] = useState<Media[]>([]);

    useEffect(() => {
        const load = async () => {
            const items = await mediaDB.media
                .orderBy('timestamp')
                .reverse()
                .toArray();
            setMediaItems(items);
        };
        load();
    }, []);

    return (
        <div className="grid grid-cols-3 gap-2 p-4">
            {mediaItems.map((item, idx) => {
                const url = URL.createObjectURL(item.blob);
                return item.type === 'image' ? (
                    <img
                        key={idx}
                        src={url}
                        alt=""
                        className="w-full h-auto rounded"
                    />
                ) : item.type === 'video' ? (
                    <video
                        key={idx}
                        src={url}
                        controls
                        className="w-full h-auto rounded"
                    />
                ) : (
                    <audio key={idx} controls src={url} className="w-full" />
                );
            })}
        </div>
    );
}
