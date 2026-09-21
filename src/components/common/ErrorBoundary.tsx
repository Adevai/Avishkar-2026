import React from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Global Error Boundary — wraps the app so an unexpected render error
 * shows a branded recovery screen instead of a blank white page.
 */
export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Hook for Sentry/observability in production
    console.error('[ErrorBoundary]', error.message, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-ivory flex items-center justify-center p-6">
          <div className="premium-card max-w-md w-full p-8 text-center">
            <div className="inline-flex p-3.5 rounded-2xl bg-amber-50 border border-amber-200 mb-4">
              <AlertTriangle className="w-7 h-7 text-amber-600" />
            </div>
            <h1 className="display-3 text-ink-900">Something went wrong</h1>
            <p className="text-sm text-ink-500 mt-2">
              An unexpected error interrupted this view. Your data is safe — reloading usually fixes it.
            </p>
            {this.state.error && (
              <p className="mt-3 text-[11px] font-mono text-ink-400 bg-ivory-deep border border-ink-900/[0.06] rounded-xl p-3 break-words text-left">
                {this.state.error.message}
              </p>
            )}
            <div className="flex gap-2.5 mt-6">
              <button
                onClick={() => window.location.reload()}
                className="btn-gold flex-1"
              >
                <RotateCcw className="w-4 h-4" /> Reload
              </button>
              <button
                onClick={() => { window.location.href = '/'; }}
                className="btn-ghost flex-1"
              >
                <Home className="w-4 h-4" /> Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
};
