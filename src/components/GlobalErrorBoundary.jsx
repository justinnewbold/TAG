import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

/**
 * Global Error Boundary - Catches any unhandled errors in the React tree
 * and displays a user-friendly error message with recovery options.
 */
class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });

    // Log error to console in development
    if (import.meta.env.DEV) {
      console.error('Global error boundary caught:', error, errorInfo);
    }

    // Report to error tracking service (Sentry, etc.)
    if (window.Sentry) {
      window.Sentry.captureException(error, {
        extra: {
          componentStack: errorInfo?.componentStack,
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
      // Clear only the potentially corrupted game state
      const storage = localStorage.getItem('tag-game-storage');
      if (storage) {
        const parsed = JSON.parse(storage);
        // Preserve user, settings, and other important data
        // Only clear potentially corrupted game-related state
        const preserved = {
          state: {
            user: parsed.state?.user,
            settings: parsed.state?.settings,
            // Clear these as they may be corrupted:
            // currentGame, games, friends, etc.
          },
          version: parsed.version,
        };
        localStorage.setItem('tag-game-storage', JSON.stringify(preserved));
      }
    } catch (e) {
      // If parsing fails, the storage is corrupted - clear it
      try {
        localStorage.removeItem('tag-game-storage');
      } catch (e2) {
        // Ignore storage errors
      }
    }
    window.location.href = '/';
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
          <div className="max-w-md w-full card p-6 text-center space-y-6">
            {/* Error Icon */}
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>

            {/* Error Message */}
            <div className="space-y-2">
              <h1 className="text-xl font-bold text-white">Something went wrong</h1>
              <p className="text-gray-400">
                We're sorry, but something unexpected happened. Please try refreshing the page.
              </p>
            </div>

            {/* Error Details (Development Only) */}
            {import.meta.env.DEV && this.state.error && (
              <details className="text-left bg-dark-800 rounded-lg p-4 text-sm">
                <summary className="cursor-pointer text-gray-400 hover:text-white">
                  Error Details
                </summary>
                <pre className="mt-2 overflow-auto text-red-400 text-xs">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            {/* Recovery Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleRefresh}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-neon-cyan text-dark-950 rounded-lg font-medium hover:bg-neon-cyan/90 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh Page
              </button>

              <button
                onClick={this.handleGoHome}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-dark-700 text-white rounded-lg font-medium hover:bg-dark-600 transition-colors"
              >
                <Home className="w-4 h-4" />
                Go to Home
              </button>
            </div>

            {/* Retry Option */}
            <button
              onClick={this.handleReset}
              className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
            >
              Try to recover without refreshing
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default GlobalErrorBoundary;
