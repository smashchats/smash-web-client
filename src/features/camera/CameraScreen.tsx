import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { type DIDString, IMMediaEmbedded } from 'smash-node-lib';

import { messageController } from '../../controllers/messageController';
import { db } from '../../lib/db';
import { mediaDB } from '../../lib/mediaStore';
import { useUIStore } from '../../lib/uiStore';
import type { SmashConversation } from '../../types/smash';
import CameraOverlay from './CameraOverlay';
import CameraView, { type CameraViewHandle } from './CameraView';
import CapturePreview from './CapturePreview';
import DiscussionSelection from './DiscussionSelection';
import type { CameraMode } from './cameraModes';
import { useCamera } from './useCamera';

export default function CameraScreen() {
    const [searchParams] = useSearchParams();
    const conversationId = searchParams.get('conversationId');
    const [conversation, setConversation] = useState<SmashConversation | null>(
        null,
    );
    const { videoRef, isFront, multipleDevices, toggleDevice } = useCamera();

    const navigate = useNavigate();
    const cameraRef = useRef<CameraViewHandle>(null);
    const [capturedId, setCapturedId] = useState<number | null>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);

    const [mode, setMode] = useState<CameraMode>('capture');
    const setShowBottomNav = useUIStore((s) => s.setShowBottomNav);

    useEffect(() => {
        if (!conversationId) return;
        console.log('Loading conversation', conversationId);
        (async () => {
            const conversation = await db.getConversation(conversationId);
            console.log('Conversation loaded', conversation);
            setConversation(conversation ?? null);
        })();
    }, [conversationId]);

    useEffect(() => {
        if (conversation) {
            setShowBottomNav(false);
        } else {
            setShowBottomNav(mode === 'capture');
        }
    }, [conversation, mode, setShowBottomNav]);

    useEffect(() => {
        const resume = async () => {
            const id = localStorage.getItem('lastCapturedId');
            if (!id) return;

            const entry = await mediaDB.media.get(Number(id));
            if (!entry?.isPending) return;

            const url = URL.createObjectURL(entry.blob);
            setCapturedImage(url);
            setMode('preview');
        };

        resume();
    }, []);

    const handleCapture = () => {
        cameraRef.current?.captureImageToBlob(async (blob) => {
            if (!blob) return;
            const id = await mediaDB.media.add({
                type: 'image',
                blob,
                timestamp: Date.now(),
                isPending: true,
            });
            localStorage.setItem('lastCapturedId', id.toString());
            setCapturedId(id);
            setCapturedBlob(blob);

            const url = URL.createObjectURL(blob);
            setCapturedImage(url);
            setMode('preview');
        });
    };

    const handleDiscard = async () => {
        if (capturedId !== null) {
            await mediaDB.media.delete(capturedId);
        }
        localStorage.removeItem('lastCapturedId');

        if (capturedImage) URL.revokeObjectURL(capturedImage);
        setCapturedImage(null);
        setCapturedId(null);
        setCapturedBlob(null);
        setMode('capture');
    };

    const handleDownload = () => {
        if (!capturedImage) return;

        const link = document.createElement('a');

        link.download = `smash-capture-${new Date()
            .toISOString()
            .replace(/[:.]/g, '-')}.jpg`;
        link.href = capturedImage;

        document.body.appendChild(link);

        link.click();

        document.body.removeChild(link);
    };

    const handleBackToPreview = () => {
        setMode('preview');
    };

    const handleSendSelected = async (selectedIds: string[]) => {
        console.log('Sending to discussions:', selectedIds);
        const message = await IMMediaEmbedded.fromFile(capturedBlob!);
        await Promise.all(
            selectedIds.map((id) =>
                messageController.sendMessage(id as DIDString, message),
            ),
        );
        await mediaDB.media.update(
            Number(localStorage.getItem('lastCapturedId')),
            {
                isPending: false,
            },
        );
        localStorage.removeItem('lastCapturedId');
        URL.revokeObjectURL(capturedImage!);
        setCapturedImage(null);
        setCapturedId(null);
        setCapturedBlob(null);
        navigate('/chats', { replace: true });
    };

    return (
        <>
            {/* CameraView is always present to keep camera active but visually hidden in preview mode */}
            <div
                style={{
                    visibility: mode === 'capture' ? 'visible' : 'hidden',
                }}
            >
                <CameraView
                    ref={cameraRef}
                    shouldMirrorImage={isFront}
                    videoRef={videoRef!}
                />
            </div>

            {mode === 'preview' && capturedImage && (
                <CapturePreview imageUrl={capturedImage} />
            )}

            <CameraOverlay
                mode={mode}
                setMode={setMode}
                onCapture={handleCapture}
                onDownload={handleDownload}
                onBackFromPreview={handleDiscard}
                conversation={conversation}
                toggleDevice={toggleDevice}
                multipleDevices={multipleDevices}
            />
            {mode === 'discussion-selection' && capturedImage && (
                <DiscussionSelection
                    onSend={handleSendSelected}
                    onBack={handleBackToPreview}
                    conversation={conversation}
                />
            )}
        </>
    );
}
