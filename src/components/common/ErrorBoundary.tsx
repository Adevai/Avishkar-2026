import React from 'react';

interface State {
  hasError: boolean;
  message?: string;
}

/**
 * Catches render-time errors anywhere below it and shows a recoverable
 * panel instead of a white screen. Users can reload or return home.
 */
export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error?.message, info?.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-8">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-rose-200 shadow-md text-center space-y-3">
          <div className="text-3xl">⚠️</div>
          <h2 className="text-lg font-bold text-slate-900">Something went wrong</h2>
          <p className="text-xs text-slate-500">
            {this.state.message || 'An unexpected error occurred while rendering this section.'}
          </p>
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs"
            >
              ↻ Reload
            </button>
            <a
              href="/"
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs"
            >
              Go home
            </a>
          </div>
        </div>
      </div>
    );
  }
}
