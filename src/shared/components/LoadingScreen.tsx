import { MessageCircle } from 'lucide-react';

import './LoadingScreen.css';

type LoadingScreenProps = Readonly<{
    message?: string;
}>;

export default function LoadingScreen({
    message = 'Loading...',
}: LoadingScreenProps) {
    return (
        <div className="loading-screen">
            <div className="loading-screen-content">
                <div className="loading-screen-logo">
                    <div className="loading-logo-container">
                        <MessageCircle className="loading-logo-icon" />
                        <div className="loading-logo-pulse"></div>
                    </div>
                    <h1 className="loading-screen-brand">Smashchats</h1>
                </div>

                {message && <p className="loading-screen-message">{message}</p>}

                <div className="loading-screen-spinner">
                    <div className="spinner-dot"></div>
                    <div className="spinner-dot"></div>
                    <div className="spinner-dot"></div>
                </div>
            </div>
        </div>
    );
}
