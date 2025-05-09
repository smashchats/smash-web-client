import { useEffect, useRef, useState } from 'react';

import ScreenWrapper from '../../components/ScreenWrapper';
import { type Media, getAllMedia, getMediaByType } from '../../lib/mediaStore';
import './GalleryScreen.css';

type MediaType = 'all' | 'image' | 'video' | 'audio';

export default function GalleryScreen() {
    const [media, setMedia] = useState<Media[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeType, setActiveType] = useState<MediaType>('all');
    const [hasShadow, setHasShadow] = useState(false);
    const objectUrls = useRef<string[]>([]);
    const contentRef = useRef<HTMLDivElement>(null);

    // Cleanup object URLs when component unmounts
    useEffect(() => {
        const cleanup = objectUrls.current;
        return () => {
            cleanup.forEach((url) => {
                URL.revokeObjectURL(url);
            });
        };
    }, []);

    useEffect(() => {
        const handleScroll = () => {
            if (contentRef.current) {
                const scrollTop = contentRef.current.scrollTop;
                setHasShadow(scrollTop > 16); // 16px = header padding
            }
        };

        const contentElement = contentRef.current;
        if (contentElement) {
            contentElement.addEventListener('scroll', handleScroll);
        }

        return () => {
            if (contentElement) {
                contentElement.removeEventListener('scroll', handleScroll);
            }
        };
    }, []);

    useEffect(() => {
        async function loadMedia() {
            try {
                setLoading(true);

                let mediaItems: Media[];
                if (activeType === 'all') {
                    mediaItems = await getAllMedia();
                } else {
                    mediaItems = await getMediaByType(activeType);
                }

                setMedia(mediaItems);
            } catch (error) {
                console.error('Failed to load media:', error);
            } finally {
                setLoading(false);
            }
        }

        loadMedia();
    }, [activeType]);

    const createAndTrackObjectUrl = (blob: Blob): string => {
        const url = URL.createObjectURL(blob);
        objectUrls.current.push(url);
        return url;
    };

    const handleTypeChange = (type: MediaType) => {
        setActiveType(type);
    };

    return (
        <ScreenWrapper
            title="Gallery"
            shouldAvoidBottomNav={true}
            headerStyle={{ paddingBottom: 12 }}
            contentStyle={{ bottom: -4 }}
        >
            <div className="gallery-screen">
                <div className="gallery-filters">
                    <button
                        className={activeType === 'all' ? 'active' : ''}
                        onClick={() => handleTypeChange('all')}
                    >
                        All
                    </button>
                    <button
                        className={activeType === 'image' ? 'active' : ''}
                        onClick={() => handleTypeChange('image')}
                    >
                        Images
                    </button>
                    <button
                        className={activeType === 'video' ? 'active' : ''}
                        onClick={() => handleTypeChange('video')}
                    >
                        Videos
                    </button>
                    <button
                        className={activeType === 'audio' ? 'active' : ''}
                        onClick={() => handleTypeChange('audio')}
                    >
                        Audio
                    </button>
                </div>

                <div
                    className={`gallery-separator ${hasShadow ? 'with-shadow' : ''}`}
                />

                <div className="gallery-content" ref={contentRef}>
                    {loading ? (
                        <div className="gallery-loading">Loading...</div>
                    ) : media.length === 0 ? (
                        <div className="gallery-empty">No media found</div>
                    ) : (
                        <div className="gallery-grid">
                            {media.map((item, index) => (
                                <div
                                    className="gallery-item"
                                    key={item.id || index}
                                >
                                    {item.type === 'image' ? (
                                        <img
                                            src={createAndTrackObjectUrl(
                                                item.blob,
                                            )}
                                            alt={`Gallery item ${index + 1}`}
                                        />
                                    ) : item.type === 'video' ? (
                                        <video
                                            src={createAndTrackObjectUrl(
                                                item.blob,
                                            )}
                                            controls
                                        />
                                    ) : (
                                        <audio
                                            src={createAndTrackObjectUrl(
                                                item.blob,
                                            )}
                                            controls
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </ScreenWrapper>
    );
}
