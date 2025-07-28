import './LoadingScreen.css';

type LoadingScreenProps = Readonly<{
    message?: string;
}>;

export default function LoadingScreen({ 
    message = ''
}: LoadingScreenProps) {
    return (
        <div className="loading-screen">
            <div className="loading-screen-content">
                <h1 className="loading-screen-title">{message}</h1>
                <div className="loading-screen-spinner">
                    <div className="spinner-dot"></div>
                    <div className="spinner-dot"></div>
                    <div className="spinner-dot"></div>
                </div>
            </div>
        </div>
    );
} 
