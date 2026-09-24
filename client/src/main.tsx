import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App.js';
import { ToastProvider } from './hooks/useToast.js';
import { ErrorBoundary } from './components/common/ErrorBoundary.js';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <App />
      </ToastProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
