/**
 * Security Middleware
 * Comprehensive security layer including rate limiting, IP blocking, and abuse detection
 */

import { rateLimiter, RateLimitConfigs } from '../utils/rateLimiter.js';
import { logger } from '../utils/logger.js';

// IP-based blocking store
const blockedIPs = new Map(); // ip -> { until: timestamp, reason: string }
const ipRequestCounts = new Map(); // ip -> { count, windowStart }
const suspiciousActivity = new Map(); // ip/userId -> { violations: [], score: number }

// Configuration
const SECURITY_CONFIG = {
  // IP blocking
  maxRequestsPerMinute: 300, // Total requests per minute per IP
  maxFailedAuthAttempts: 10, // Failed auth attempts before temp block
  blockDurationMinutes: 15, // Default block duration
  permanentBlockThreshold: 5, // Number of temp blocks before permanent

  // Abuse detection
  suspicionThreshold: 100, // Score before automatic action
  suspicionDecayRate: 10, // Points to decay per hour

  // DDoS protection
  burstLimit: 50, // Max requests in 1 second
  burstWindowMs: 1000,
};

// Violation types with severity scores
const VIOLATION_SCORES = {
  RATE_LIMIT_EXCEEDED: 5,
  FAILED_AUTH: 10,
  INVALID_TOKEN: 15,
  SUSPICIOUS_PAYLOAD: 20,
  SQL_INJECTION_ATTEMPT: 50,
  XSS_ATTEMPT: 50,
  REPEATED_VIOLATIONS: 25,
  BURST_DETECTED: 30,
};

/**
 * Check if an IP is blocked
 */
export function isIPBlocked(ip) {
  const block = blockedIPs.get(ip);
  if (!block) return false;

  if (block.until === 'permanent') return true;

  if (Date.now() > block.until) {
    blockedIPs.delete(ip);
    return false;
  }

  return true;
}

/**
 * Block an IP address
 */
export function blockIP(ip, durationMinutes = SECURITY_CONFIG.blockDurationMinutes, reason = 'Suspicious activity') {
  const existingBlock = blockedIPs.get(ip);
  const blockCount = existingBlock?.count || 0;

  // Check if should be permanent
  if (blockCount >= SECURITY_CONFIG.permanentBlockThreshold) {
    blockedIPs.set(ip, { until: 'permanent', reason, count: blockCount + 1 });
    logger.warn('IP permanently blocked', { ip, reason });
    return;
  }

  const until = Date.now() + (durationMinutes * 60 * 1000);
  blockedIPs.set(ip, { until, reason, count: blockCount + 1 });
  logger.warn('IP temporarily blocked', { ip, reason, durationMinutes });
}

/**
 * Unblock an IP address
 */
export function unblockIP(ip) {
  blockedIPs.delete(ip);
  logger.info('IP unblocked', { ip });
}

/**
 * Record a security violation
 */
export function recordViolation(identifier, violationType, metadata = {}) {
  const entry = suspiciousActivity.get(identifier) || { violations: [], score: 0, lastUpdate: Date.now() };

  // Decay score based on time passed
  const hoursPassed = (Date.now() - entry.lastUpdate) / (1000 * 60 * 60);
  entry.score = Math.max(0, entry.score - (hoursPassed * SECURITY_CONFIG.suspicionDecayRate));

  // Add new violation
  const score = VIOLATION_SCORES[violationType] || 10;
  entry.violations.push({
    type: violationType,
    timestamp: Date.now(),
    metadata,
  });
  entry.score += score;
  entry.lastUpdate = Date.now();

  // Keep only last 100 violations
  if (entry.violations.length > 100) {
    entry.violations = entry.violations.slice(-100);
  }

  suspiciousActivity.set(identifier, entry);

  logger.warn('Security violation recorded', { identifier, violationType, score: entry.score, metadata });

  // Check if action needed
  if (entry.score >= SECURITY_CONFIG.suspicionThreshold) {
    // Auto-block if it's an IP
    if (/^\d+\.\d+\.\d+\.\d+$/.test(identifier) || identifier.includes(':')) {
      blockIP(identifier, SECURITY_CONFIG.blockDurationMinutes * 2, 'Suspicion threshold exceeded');
    }
    return { action: 'blocked', score: entry.score };
  }

  return { action: 'recorded', score: entry.score };
}

/**
 * Get suspicion score for an identifier
 */
export function getSuspicionScore(identifier) {
  const entry = suspiciousActivity.get(identifier);
  if (!entry) return 0;

  // Decay score
  const hoursPassed = (Date.now() - entry.lastUpdate) / (1000 * 60 * 60);
  return Math.max(0, entry.score - (hoursPassed * SECURITY_CONFIG.suspicionDecayRate));
}

/**
 * Check for burst (DDoS-like) traffic
 */
function checkBurst(ip) {
  const now = Date.now();
  const key = `burst:${ip}`;
  let entry = ipRequestCounts.get(key);

  if (!entry || now - entry.windowStart > SECURITY_CONFIG.burstWindowMs) {
    entry = { count: 0, windowStart: now };
  }

  entry.count++;
  ipRequestCounts.set(key, entry);

  if (entry.count > SECURITY_CONFIG.burstLimit) {
    recordViolation(ip, 'BURST_DETECTED', { count: entry.count });
    return false;
  }

  return true;
}

/**
 * IP blocking middleware
 */
export function ipBlockMiddleware(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;

  if (isIPBlocked(ip)) {
    const block = blockedIPs.get(ip);
    logger.debug('Blocked IP attempted access', { ip });
    return res.status(403).json({
      error: 'Access denied',
      reason: 'Your IP has been temporarily blocked due to suspicious activity',
      until: block.until === 'permanent' ? 'permanent' : new Date(block.until).toISOString(),
    });
  }

  // Check burst traffic
  if (!checkBurst(ip)) {
    return res.status(429).json({
      error: 'Too many requests',
      message: 'Please slow down',
    });
  }

  next();
}

/**
 * General rate limit middleware for all API requests
 */
export function apiRateLimitMiddleware(req, res, next) {
  const identifier = req.user?.id || req.ip;
  const result = rateLimiter.check(identifier, 'API_GENERAL');

  res.setHeader('X-RateLimit-Limit', RateLimitConfigs.API_GENERAL.maxRequests);
  res.setHeader('X-RateLimit-Remaining', result.remaining);
  res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000));

  if (!result.allowed) {
    recordViolation(identifier, 'RATE_LIMIT_EXCEEDED', { endpoint: req.path });
    res.setHeader('Retry-After', result.retryAfter);
    return res.status(429).json({
      error: result.error,
      retryAfter: result.retryAfter,
    });
  }

  next();
}

/**
 * Authentication rate limit middleware
 */
export function authRateLimitMiddleware(req, res, next) {
  const ip = req.ip;
  const result = rateLimiter.check(ip, 'AUTH_ATTEMPT');

  if (!result.allowed) {
    recordViolation(ip, 'FAILED_AUTH', { endpoint: req.path });

    // Check if should block
    const score = getSuspicionScore(ip);
    if (score >= 50) {
      blockIP(ip, SECURITY_CONFIG.blockDurationMinutes, 'Too many failed auth attempts');
    }

    return res.status(429).json({
      error: 'Too many authentication attempts',
      retryAfter: result.retryAfter,
    });
  }

  next();
}

/**
 * Socket event rate limiter
 */
export function createSocketRateLimiter() {
  return {
    check(socket, eventType) {
      const userId = socket.user?.id || socket.id;
      const actionType = eventType.toUpperCase().replace(':', '_');
      const config = RateLimitConfigs[actionType] || RateLimitConfigs.API_GENERAL;

      const result = rateLimiter.check(userId, actionType, config);

      if (!result.allowed) {
        recordViolation(userId, 'RATE_LIMIT_EXCEEDED', { event: eventType });
        socket.emit('error:rateLimit', {
          message: result.error,
          retryAfter: result.retryAfter,
        });
        return false;
      }

      return true;
    },
  };
}

/**
 * Suspicious payload detection patterns
 */
const SUSPICIOUS_PATTERNS = [
  // SQL injection
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER)\b.*\b(FROM|INTO|TABLE|WHERE)\b)/i,
  /(--|#|\/\*|\*\/|;)/,
  /(\bOR\b|\bAND\b).*[=<>]/i,

  // XSS
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<iframe/gi,

  // Path traversal
  /\.\.\//g,
  /%2e%2e%2f/gi,

  // Command injection
  /[;&|`$(){}[\]]/,
];

/**
 * Detect suspicious content in request
 */
export function detectSuspiciousContent(content) {
  if (typeof content !== 'string') {
    content = JSON.stringify(content);
  }

  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(content)) {
      return {
        suspicious: true,
        pattern: pattern.toString(),
      };
    }
  }

  return { suspicious: false };
}

/**
 * Request sanitization middleware
 */
export function sanitizationMiddleware(req, res, next) {
  const ip = req.ip;

  // Check body
  if (req.body) {
    const bodyCheck = detectSuspiciousContent(req.body);
    if (bodyCheck.suspicious) {
      recordViolation(ip, 'SUSPICIOUS_PAYLOAD', { pattern: bodyCheck.pattern });
      logger.warn('Suspicious payload detected', { ip, path: req.path });
      return res.status(400).json({ error: 'Invalid request content' });
    }
  }

  // Check query params
  if (req.query) {
    const queryCheck = detectSuspiciousContent(req.query);
    if (queryCheck.suspicious) {
      recordViolation(ip, 'SUSPICIOUS_PAYLOAD', { pattern: queryCheck.pattern });
      return res.status(400).json({ error: 'Invalid query parameters' });
    }
  }

  next();
}

/**
 * Security headers middleware
 */
export function securityHeadersMiddleware(req, res, next) {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Content Security Policy (basic)
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'");

  next();
}

/**
 * Get security stats (for admin dashboard)
 */
export function getSecurityStats() {
  const now = Date.now();

  return {
    blockedIPs: Array.from(blockedIPs.entries()).map(([ip, data]) => ({
      ip,
      until: data.until === 'permanent' ? 'permanent' : new Date(data.until).toISOString(),
      reason: data.reason,
      blockCount: data.count,
    })),
    suspiciousActivities: Array.from(suspiciousActivity.entries())
      .filter(([, data]) => {
        const hoursPassed = (now - data.lastUpdate) / (1000 * 60 * 60);
        const decayedScore = data.score - (hoursPassed * SECURITY_CONFIG.suspicionDecayRate);
        return decayedScore > 0;
      })
      .map(([identifier, data]) => ({
        identifier,
        score: Math.round(getSuspicionScore(identifier)),
        recentViolations: data.violations.slice(-5),
      })),
    config: SECURITY_CONFIG,
  };
}

/**
 * Cleanup old entries periodically
 */
setInterval(() => {
  const now = Date.now();

  // Cleanup expired blocks
  for (const [ip, block] of blockedIPs) {
    if (block.until !== 'permanent' && now > block.until) {
      blockedIPs.delete(ip);
    }
  }

  // Cleanup old suspicious activity (older than 24 hours with 0 score)
  for (const [identifier, data] of suspiciousActivity) {
    const hoursPassed = (now - data.lastUpdate) / (1000 * 60 * 60);
    const decayedScore = data.score - (hoursPassed * SECURITY_CONFIG.suspicionDecayRate);
    if (decayedScore <= 0 && hoursPassed > 24) {
      suspiciousActivity.delete(identifier);
    }
  }

  // Cleanup burst tracking
  for (const [key, entry] of ipRequestCounts) {
    if (now - entry.windowStart > 60000) {
      ipRequestCounts.delete(key);
    }
  }
}, 5 * 60 * 1000); // Every 5 minutes

export default {
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
};
