import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    // Log error to console in development
    console.error('Error caught by boundary:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-dark-900 text-white flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center">
            <div className="mb-6">
              <AlertTriangle className="w-16 h-16 text-neon-orange mx-auto mb-4" />
              <h1 className="text-2xl font-display font-bold mb-2">
                Something went wrong
              </h1>
              <p className="text-white/60">
                {this.props.fallbackMessage || "We're sorry, but something unexpected happened. Please try again."}
              </p>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-left overflow-auto max-h-48">
                <p className="text-sm text-red-400 font-mono">
                  {this.state.error.toString()}
                </p>
                {this.state.errorInfo && (
                  <pre className="text-xs text-red-400/70 mt-2 whitespace-pre-wrap">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReload}
                className="flex items-center gap-2 px-6 py-3 bg-neon-cyan/20 text-neon-cyan rounded-xl hover:bg-neon-cyan/30 transition-colors"
              >
                <RefreshCw className="w-5 h-5" />
                Reload
              </button>
              <button
                onClick={this.handleGoHome}
                className="flex items-center gap-2 px-6 py-3 bg-white/10 rounded-xl hover:bg-white/20 transition-colors"
              >
                <Home className="w-5 h-5" />
                Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Wrapper for specific pages/features
export function GameErrorBoundary({ children }) {
  return (
    <ErrorBoundary fallbackMessage="There was a problem with the game. Please reload and try again.">
      {children}
    </ErrorBoundary>
  );
}

export function MapErrorBoundary({ children }) {
  return (
    <ErrorBoundary fallbackMessage="There was a problem loading the map. Please check your connection and try again.">
      {children}
    </ErrorBoundary>
  );
}

export default ErrorBoundary;
