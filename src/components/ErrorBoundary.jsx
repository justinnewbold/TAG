import React from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';

/**
 * Enhanced Global Error Boundary with recovery options
 */
class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState(prev => ({ 
      errorInfo,
      errorCount: prev.errorCount + 1,
    }));
    
    // Log to console in dev
    if (import.meta.env.DEV) {
      console.error('Error caught by boundary:', error, errorInfo);
    }

    // Could send to error tracking service here
    // sentry.captureException(error, { extra: errorInfo });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleHardRefresh = () => {
    // Clear local storage and refresh
    localStorage.removeItem('tag-storage');
    localStorage.removeItem('tag-auth-token');
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      const { error, errorCount } = this.state;
      const isRecurring = errorCount > 2;

      return (
        <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-dark-800 rounded-2xl border border-red-500/30 overflow-hidden">
            {/* Header */}
            <div className="p-6 bg-red-500/10 border-b border-red-500/30">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-500/20 rounded-xl">
                  <AlertTriangle className="w-8 h-8 text-red-400" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">Something went wrong</h1>
                  <p className="text-red-300/70 text-sm">Don't worry, your game data is safe</p>
                </div>
              </div>
            </div>

            {/* Error details */}
            <div className="p-6 space-y-4">
              {import.meta.env.DEV && error && (
                <div className="p-3 bg-dark-700 rounded-xl">
                  <p className="text-red-400 font-mono text-sm break-all">
                    {error.message || 'Unknown error'}
                  </p>
                </div>
              )}

              {isRecurring && (
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                  <p className="text-yellow-300 text-sm">
                    This error keeps happening. Try clearing your data below.
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="space-y-2">
                <button
                  onClick={this.handleRetry}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-medium transition-colors"
                >
                  <RefreshCw className="w-5 h-5" />
                  Try Again
                </button>

                <button
                  onClick={this.handleGoHome}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-dark-700 hover:bg-dark-600 text-white rounded-xl font-medium transition-colors"
                >
                  <Home className="w-5 h-5" />
                  Go to Home
                </button>

                {isRecurring && (
                  <button
                    onClick={this.handleHardRefresh}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl font-medium transition-colors"
                  >
                    <Bug className="w-5 h-5" />
                    Clear Data & Restart
                  </button>
                )}
              </div>

              {/* Help text */}
              <p className="text-gray-500 text-xs text-center">
                If this keeps happening, try refreshing the page or clearing your browser cache.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Game-specific error boundary - shows in-game without breaking the whole app
 */
export class GameErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Game error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-dark-800 rounded-2xl border border-red-500/30 m-4">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-6 h-6 text-red-400" />
            <h3 className="text-lg font-bold text-white">Game Error</h3>
          </div>
          <p className="text-gray-400 mb-4">
            Something went wrong loading this section.
          </p>
          <button
            onClick={this.handleRetry}
            className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium transition-colors"
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default GlobalErrorBoundary;
