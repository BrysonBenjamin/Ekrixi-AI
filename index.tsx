
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { TutorialProvider } from './components/shared/tutorial/TutorialSystem';

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
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-screen bg-[#050508] text-nexus-accent p-8 font-mono">
            <div className="max-w-xl w-full border border-red-900/50 bg-nexus-900/50 rounded-lg p-6 shadow-2xl">
                <h1 className="text-xl font-bold text-red-500 mb-4 flex items-center gap-2">
                    <span className="animate-pulse">⚠️</span> SYSTEM CRITICAL FAILURE
                </h1>
                <p className="text-sm text-slate-400 mb-2">The Nexus Core encountered an unrecoverable exception.</p>
                <div className="bg-black/50 p-4 rounded text-xs text-red-300 font-mono overflow-auto max-h-48 mb-6 border border-red-900/30">
                    {this.state.error?.message || "Unknown Unknowns detected."}
                </div>
                <button 
                    onClick={() => window.location.reload()}
                    className="w-full py-3 bg-nexus-500 hover:bg-nexus-400 text-white rounded font-bold transition-all shadow-lg hover:shadow-nexus-500/25"
                >
                    INITIATE REBOOT SEQUENCE
                </button>
            </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
        <TutorialProvider>
            <App />
        </TutorialProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
