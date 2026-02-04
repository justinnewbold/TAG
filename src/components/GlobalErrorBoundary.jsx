import React from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { logger } from '../utils/logger';

const errorLogger = logger.scope('ErrorBoundary');

/**
 * Global Error Boundary - Catches any unhandled errors in the React tree
 * and displays a user-friendly error message with recovery options.
 *
 * Consolidated from multiple error boundary implementations.
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
    this.setState((prev) => ({
      errorInfo,
      errorCount: prev.errorCount + 1,
    }));

    // Log error using structured logger
    errorLogger.error('Unhandled error caught', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo?.componentStack,
    });

    // Report to error tracking service (Sentry, etc.)
    if (window.Sentry) {
      window.Sentry.captureException(error, {
        extra: {
          componentStack: errorInfo?.componentStack,
          errorCount: this.state.errorCount + 1,
        },
      });
    }
  }

  handleRefresh = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    // Only clear game-specific state, preserve user preferences and auth
    try {
      const storage = localStorage.getItem('tag-game-storage');
      if (storage) {
        const parsed = JSON.parse(storage);
        // Preserve user, settings, and other important data
        const preserved = {
          state: {
            user: parsed.state?.user,
            settings: parsed.state?.settings,
            stats: parsed.state?.stats,
            achievements: parsed.state?.achievements,
            // Clear potentially corrupted game-related state
          },
          version: parsed.version,
        };
        localStorage.setItem('tag-game-storage', JSON.stringify(preserved));
      }
    } catch (e) {
      errorLogger.warn('Failed to preserve state during error recovery', { error: e.message });
    }
    window.location.href = '/';
  };

  handleHardRefresh = () => {
    // Clear all local storage and refresh
    try {
      localStorage.removeItem('tag-game-storage');
      localStorage.removeItem('tag-auth-token');
      localStorage.removeItem('tag-refresh-token');
    } catch (e) {
      // Ignore storage errors
    }
    window.location.href = '/';
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
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
                <div className="p-3 bg-red-500/20 rounded-xl" aria-hidden="true">
                  <AlertTriangle className="w-8 h-8 text-red-400" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white" role="alert">
                    Something went wrong
                  </h1>
                  <p className="text-red-300/70 text-sm">
                    Don't worry, your game data is safe
                  </p>
                </div>
              </div>
            </div>

            {/* Error details */}
            <div className="p-6 space-y-4">
              {/* Error message in development */}
              {import.meta.env.DEV && error && (
                <details className="group">
                  <summary className="cursor-pointer text-gray-400 hover:text-white text-sm flex items-center gap-2">
                    <span>Error Details</span>
                    <span className="text-xs">(click to expand)</span>
                  </summary>
                  <div className="mt-2 p-3 bg-dark-700 rounded-xl">
                    <p className="text-red-400 font-mono text-sm break-all">
                      {error.message || 'Unknown error'}
                    </p>
                    {this.state.errorInfo?.componentStack && (
                      <pre className="mt-2 text-xs text-gray-500 overflow-auto max-h-32">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    )}
                  </div>
                </details>
              )}

              {/* Recurring error warning */}
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
                  onClick={this.handleReset}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-medium transition-colors"
                >
                  <RefreshCw className="w-5 h-5" aria-hidden="true" />
                  Try Again
                </button>

                <button
                  onClick={this.handleGoHome}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-dark-700 hover:bg-dark-600 text-white rounded-xl font-medium transition-colors"
                >
                  <Home className="w-5 h-5" aria-hidden="true" />
                  Go to Home
                </button>

                {isRecurring && (
                  <button
                    onClick={this.handleHardRefresh}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl font-medium transition-colors"
                  >
                    <Bug className="w-5 h-5" aria-hidden="true" />
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
 * Game-specific error boundary - shows inline error without breaking the whole app
 * Use this for wrapping individual game components/sections
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
    errorLogger.error('Game component error', {
      error: error.message,
      component: this.props.name || 'unknown',
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback({ error: this.state.error, retry: this.handleRetry });
      }

      return (
        <div className="p-6 bg-dark-800 rounded-2xl border border-red-500/30 m-4">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-6 h-6 text-red-400" aria-hidden="true" />
            <h3 className="text-lg font-bold text-white">
              {this.props.title || 'Something went wrong'}
            </h3>
          </div>
          <p className="text-gray-400 mb-4">
            {this.props.message || 'Something went wrong loading this section.'}
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

/**
 * HOC to wrap a component with GameErrorBoundary
 */
export function withErrorBoundary(Component, options = {}) {
  return function WrappedComponent(props) {
    return (
      <GameErrorBoundary {...options}>
        <Component {...props} />
      </GameErrorBoundary>
    );
  };
}

export default GlobalErrorBoundary;
