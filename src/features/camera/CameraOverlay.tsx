import { ArrowLeft, Download, Send, SwitchCamera } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import Button from '../../components/Button';
import type { SmashConversation } from '../../types/smash';
import './CameraOverlay.css';
import FloatingButton from './FloatingButton';
import type { CameraMode } from './cameraModes';

type Props = {
    mode: CameraMode;
    setMode: (mode: CameraMode) => void;
    onCapture: () => void;
    onDownload: () => void;
    onBackFromPreview?: () => void;
    conversation: SmashConversation | null;
    toggleDevice: () => void;
    multipleDevices: boolean;
};

export default function CameraOverlay({
    mode,
    setMode,
    onCapture,
    onDownload,
    onBackFromPreview,
    conversation,
    toggleDevice,
    multipleDevices,
}: Readonly<Props>) {
    const navigate = useNavigate();

    const handleSend = () => {
        setMode('discussion-selection');
    };

    const handleBack = () => {
        if (mode === 'preview') {
            onBackFromPreview?.();
            setMode('capture');
        } else if (mode === 'discussion-selection') {
            setMode('preview');
        } else {
            navigate('/chats');
        }
    };

    const shouldShowBackButton =
        mode === 'preview' || (mode === 'capture' && conversation !== null);

    return (
        <div className="camera-overlay">
            {shouldShowBackButton && (
                <FloatingButton
                    icon={<ArrowLeft size={24} />}
                    onClick={handleBack}
                    colorMode="auto"
                />
            )}
            {mode === 'capture' && multipleDevices && (
                <FloatingButton
                    position="top-right"
                    icon={<SwitchCamera size={24} />}
                    onClick={toggleDevice}
                    colorMode="auto"
                />
            )}
            {mode === 'preview' && (
                <div className="camera-overlay-floating-bar">
                    <Button
                        variant="icon"
                        colorMode="auto"
                        onClick={onDownload}
                        className="camera-overlay-icon-button"
                    >
                        <Download size={20} />
                    </Button>

                    <Button
                        variant="primary"
                        colorMode="auto"
                        onClick={handleSend}
                        className="camera-overlay-send-button"
                    >
                        <span className="camera-overlay-send-text">
                            Send to
                        </span>
                        <Send size={20} />
                    </Button>
                </div>
            )}
            {mode === 'capture' && (
                <button
                    className="camera-overlay-capture-button"
                    onClick={onCapture}
                />
            )}
        </div>
    );
}
