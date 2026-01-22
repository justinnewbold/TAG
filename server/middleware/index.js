/**
 * Middleware Index
 * Central export for all middleware functions
 */

// Security middleware
export {
  ipBlockMiddleware,
  apiRateLimitMiddleware,
  authRateLimitMiddleware,
  sanitizationMiddleware,
  securityHeadersMiddleware,
  createSocketRateLimiter,
  isIPBlocked,
  blockIP,
  unblockIP,
  recordViolation,
  getSuspicionScore,
  getSecurityStats,
} from './security.js';

// Re-export validation
export { validateRequest, schemas } from '../utils/schemas.js';

// Re-export auth
export { authenticateToken, authenticateSocket } from '../auth.js';

// Re-export rate limiter
export { rateLimitMiddleware, checkRateLimit } from '../utils/rateLimiter.js';

/**
 * Apply all standard middleware to an Express app
 */
export function applySecurityMiddleware(app) {
  const {
    ipBlockMiddleware,
    apiRateLimitMiddleware,
    securityHeadersMiddleware,
    sanitizationMiddleware,
  } = require('./security.js');

  // Order matters!
  // 1. Security headers (always first)
  app.use(securityHeadersMiddleware);

  // 2. IP blocking (block known bad actors early)
  app.use(ipBlockMiddleware);

  // 3. General rate limiting
  app.use('/api', apiRateLimitMiddleware);

  // 4. Request sanitization
  app.use(sanitizationMiddleware);
}

/**
 * Apply security to Socket.IO
 */
export function applySocketSecurity(io) {
  const { createSocketRateLimiter, isIPBlocked, recordViolation } = require('./security.js');
  const { authenticateSocket } = require('../auth.js');
  const rateLimiter = createSocketRateLimiter();

  // Authentication middleware
  io.use(authenticateSocket);

  // IP blocking middleware
  io.use((socket, next) => {
    const ip = socket.handshake.address;
    if (isIPBlocked(ip)) {
      recordViolation(ip, 'BLOCKED_IP_SOCKET_ATTEMPT');
      return next(new Error('Access denied'));
    }
    next();
  });

  // Rate limiting middleware
  io.use((socket, next) => {
    socket.rateLimiter = rateLimiter;
    next();
  });
}

export default {
  applySecurityMiddleware,
  applySocketSecurity,
};
