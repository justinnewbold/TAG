// Sentry integration hooks for error tracking
// This module provides pluggable error tracking that works with or without Sentry

let sentryClient = null;

// Initialize Sentry if DSN is provided
export function initSentry() {
  const dsn = process.env.SENTRY_DSN;

  if (!dsn) {
    console.log('Sentry DSN not configured - error tracking disabled');
    return false;
  }

  try {
    // Dynamic import to avoid requiring Sentry as a dependency
    // Users can install @sentry/node when needed
    import('@sentry/node').then((Sentry) => {
      Sentry.init({
        dsn,
        environment: process.env.NODE_ENV || 'development',
        release: process.env.npm_package_version || '1.0.0',
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
        beforeSend(event) {
          // Strip sensitive data before sending
          if (event.request?.headers) {
            delete event.request.headers.authorization;
            delete event.request.headers.cookie;
          }
          return event;
        },
      });
      sentryClient = Sentry;
      console.log('Sentry initialized successfully');
    }).catch((err) => {
      console.log('Sentry not available (install @sentry/node to enable):', err.message);
    });
    return true;
  } catch (error) {
    console.log('Sentry initialization failed:', error.message);
    return false;
  }
}

// Capture an exception
export function captureException(error, context = {}) {
  if (sentryClient) {
    sentryClient.withScope((scope) => {
      // Add context
      if (context.user) {
        scope.setUser({
          id: context.user.id,
          username: context.user.name,
        });
      }
      if (context.tags) {
        Object.entries(context.tags).forEach(([key, value]) => {
          scope.setTag(key, value);
        });
      }
      if (context.extra) {
        Object.entries(context.extra).forEach(([key, value]) => {
          scope.setExtra(key, value);
        });
      }
      sentryClient.captureException(error);
    });
  }

  // Always log to console as well
  console.error('Error captured:', error.message, context);
}

// Capture a message
export function captureMessage(message, level = 'info', context = {}) {
  if (sentryClient) {
    sentryClient.withScope((scope) => {
      scope.setLevel(level);
      if (context.tags) {
        Object.entries(context.tags).forEach(([key, value]) => {
          scope.setTag(key, value);
        });
      }
      sentryClient.captureMessage(message);
    });
  }

  if (level === 'error' || level === 'fatal') {
    console.error(`[${level}]`, message);
  } else {
    console.log(`[${level}]`, message);
  }
}

// Add breadcrumb for debugging
export function addBreadcrumb(breadcrumb) {
  if (sentryClient) {
    sentryClient.addBreadcrumb(breadcrumb);
  }
}

// Set user context
export function setUser(user) {
  if (sentryClient && user) {
    sentryClient.setUser({
      id: user.id,
      username: user.name,
    });
  }
}

// Clear user context
export function clearUser() {
  if (sentryClient) {
    sentryClient.setUser(null);
  }
}

// Express error handler middleware
export function sentryErrorHandler() {
  return (err, req, res, next) => {
    captureException(err, {
      user: req.user,
      tags: {
        path: req.path,
        method: req.method,
      },
      extra: {
        query: req.query,
        body: req.body,
      },
    });
    next(err);
  };
}

// Express request handler middleware (for performance monitoring)
export function sentryRequestHandler() {
  if (sentryClient) {
    return sentryClient.Handlers?.requestHandler() || ((req, res, next) => next());
  }
  return (req, res, next) => next();
}

// Socket.io error wrapper
export function wrapSocketHandler(handler) {
  return async (...args) => {
    try {
      await handler(...args);
    } catch (error) {
      captureException(error, {
        tags: { type: 'socket_handler' },
      });
      throw error;
    }
  };
}

// Flush pending events (call before shutdown)
export async function flush(timeout = 2000) {
  if (sentryClient) {
    await sentryClient.flush(timeout);
  }
}

export const sentry = {
  init: initSentry,
  captureException,
  captureMessage,
  addBreadcrumb,
  setUser,
  clearUser,
  errorHandler: sentryErrorHandler,
  requestHandler: sentryRequestHandler,
  wrapSocketHandler,
  flush,
  isEnabled: () => sentryClient !== null,
};
