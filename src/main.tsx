// Import EventEmitter polyfill first
import 'events';
import React from 'react';
import ReactDOM from 'react-dom/client';

import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './contexts/toast';
import './index.css';
import { logger } from './lib/logger';
import './polyfills';

logger.info('Initializing application');

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
