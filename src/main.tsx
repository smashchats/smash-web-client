import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import App from '@src/app/App';
import '@src/app/i18n';
import '@src/app/pwa';
import { ErrorBoundary } from '@src/shared/components/ErrorBoundary';
import '@src/shared/styles/globals.css';

// TODO: @shared, @services etc imports instead of @src/shared, @src/services etc

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
);
