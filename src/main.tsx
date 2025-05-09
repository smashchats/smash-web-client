import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import App from './app/App.tsx';
import './app/i18n';
import './app/pwa';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { SmashProvider } from './providers/SmashProvider.tsx';
import './styles/globals.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <ErrorBoundary>
            <BrowserRouter>
                <SmashProvider>
                    <App />
                </SmashProvider>
            </BrowserRouter>
        </ErrorBoundary>
    </React.StrictMode>,
);
