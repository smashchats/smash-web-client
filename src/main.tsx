import 'events';
import React from 'react';
import ReactDOM from 'react-dom/client';

import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './contexts/toast';
import { logger } from './lib/logger';
import './polyfills';
import './styles/index.css';

logger.info('Initializing application');

// Mobile optimization: Prevent various zoom and gesture behaviors
if ('ontouchstart' in window) {
    // Disable double-tap zoom
    document.addEventListener(
        'dblclick',
        (e) => {
            e.preventDefault();
        },
        { passive: false },
    );

    // Apply CSS fix for iOS 100vh issue
    const setViewportHeight = () => {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    window.addEventListener('resize', setViewportHeight);
    window.addEventListener('orientationchange', setViewportHeight);
    setViewportHeight();
}

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <ErrorBoundary>
            <ToastProvider>
                <App />
            </ToastProvider>
        </ErrorBoundary>
    </React.StrictMode>,
);

logger.debug('Application rendered successfully');
