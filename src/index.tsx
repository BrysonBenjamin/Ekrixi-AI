import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App';
import { config } from './config';
import { TutorialProvider } from './features/system/tutorial/TutorialContext';
import './index.css';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-screen bg-[#050508] text-nexus-accent p-8 font-mono">
          <div className="max-w-xl w-full border border-red-900/50 bg-nexus-900/50 rounded-lg p-6 shadow-2xl">
            <h1 className="text-xl font-bold text-red-500 mb-4 flex items-center gap-2">
              <span className="animate-pulse">⚠️</span> SYSTEM CRITICAL FAILURE
            </h1>
            <p className="text-sm text-slate-400 mb-2">
              The Nexus Core encountered an unrecoverable exception.
            </p>
            <div className="bg-black/50 p-4 rounded text-xs text-red-300 font-mono overflow-auto max-h-48 mb-6 border border-red-900/30">
              {this.state.error?.message || 'An unknown error occurred.'}
            </div>
            <p className="text-sm text-slate-400">
              Please refresh the page or contact support if the issue persists.
            </p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

const root = createRoot(rootElement);

// Use configured Client ID or a safe placeholder to prevent crashes if key is missing.
const clientId = config.googleClientId || 'PLACEHOLDER_CLIENT_ID_FOR_DEV_MODE';

root.render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={clientId}>
      <ErrorBoundary>
        <BrowserRouter>
          <TutorialProvider>
            <App />
          </TutorialProvider>
        </BrowserRouter>
      </ErrorBoundary>
    </GoogleOAuthProvider>
  </React.StrictMode>,
);
