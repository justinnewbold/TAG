/**
 * Session Management Service
 * Handles user sessions, device tracking, and concurrent session limits
 */

import crypto from 'crypto';
import { logger } from '../utils/logger.js';

// Configuration
const SESSION_CONFIG = {
  maxConcurrentSessions: 5, // Max devices per user
  sessionIdleTimeout: 30 * 60 * 1000, // 30 minutes idle timeout
  sessionAbsoluteTimeout: 24 * 60 * 60 * 1000, // 24 hours absolute timeout
  cleanupInterval: 5 * 60 * 1000, // Cleanup every 5 minutes
};

// In-memory session store (use Redis in production)
const sessions = new Map(); // sessionId -> session data
const userSessions = new Map(); // userId -> Set<sessionId>
const deviceFingerprints = new Map(); // fingerprintHash -> sessionId

// Database reference (for persistence)
let db = null;
let isPostgres = false;

/**
 * Initialize database for session persistence
 */
async function initDatabase(database, postgres = false) {
  db = database;
  isPostgres = postgres;

  const createTableSQL = isPostgres
    ? `CREATE TABLE IF NOT EXISTS user_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        device_info JSONB,
        ip_address TEXT,
        user_agent TEXT,
        fingerprint_hash TEXT,
        created_at BIGINT NOT NULL,
        last_active_at BIGINT NOT NULL,
        expires_at BIGINT NOT NULL,
        revoked BOOLEAN DEFAULT FALSE,
        revoked_reason TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_fingerprint ON user_sessions(fingerprint_hash);
      CREATE INDEX IF NOT EXISTS idx_sessions_expires ON user_sessions(expires_at);`
    : `CREATE TABLE IF NOT EXISTS user_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        device_info TEXT,
        ip_address TEXT,
        user_agent TEXT,
        fingerprint_hash TEXT,
        created_at INTEGER NOT NULL,
        last_active_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        revoked INTEGER DEFAULT 0,
        revoked_reason TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_fingerprint ON user_sessions(fingerprint_hash);`;

  try {
    if (isPostgres) {
      await db.query(createTableSQL);
    } else {
      db.exec(createTableSQL);
    }
    logger.info('Session storage table initialized');

    // Load active sessions into memory
    await loadActiveSessions();
  } catch (error) {
    logger.error('Failed to initialize session table:', error);
  }
}

/**
 * Load active sessions from database into memory
 */
async function loadActiveSessions() {
  if (!db) return;

  try {
    const now = Date.now();
    const query = isPostgres
      ? 'SELECT * FROM user_sessions WHERE expires_at > $1 AND revoked = FALSE'
      : 'SELECT * FROM user_sessions WHERE expires_at > ? AND revoked = 0';

    let rows;
    if (isPostgres) {
      const result = await db.query(query, [now]);
      rows = result.rows;
    } else {
      rows = db.prepare(query).all(now);
    }

    for (const row of rows) {
      const session = {
        id: row.id,
        userId: row.user_id,
        deviceInfo: typeof row.device_info === 'string' ? JSON.parse(row.device_info) : row.device_info,
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        fingerprintHash: row.fingerprint_hash,
        createdAt: row.created_at,
        lastActiveAt: row.last_active_at,
        expiresAt: row.expires_at,
      };

      sessions.set(session.id, session);

      if (!userSessions.has(session.userId)) {
        userSessions.set(session.userId, new Set());
      }
      userSessions.get(session.userId).add(session.id);

      if (session.fingerprintHash) {
        deviceFingerprints.set(session.fingerprintHash, session.id);
      }
    }

    logger.info(`Loaded ${rows.length} active sessions from database`);
  } catch (error) {
    logger.error('Failed to load sessions from database:', error);
  }
}

/**
 * Generate a device fingerprint from request data
 */
function generateDeviceFingerprint(userAgent, ipAddress, deviceInfo = {}) {
  const data = JSON.stringify({
    ua: userAgent,
    platform: deviceInfo.platform,
    vendor: deviceInfo.vendor,
    language: deviceInfo.language,
  });
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 32);
}

/**
 * Parse device info from user agent
 */
function parseDeviceInfo(userAgent) {
  if (!userAgent) return { type: 'unknown', name: 'Unknown Device' };

  const info = {
    type: 'unknown',
    name: 'Unknown Device',
    browser: null,
    os: null,
    isMobile: false,
  };

  // Detect mobile
  if (/Mobile|Android|iPhone|iPad|iPod/i.test(userAgent)) {
    info.isMobile = true;
    info.type = 'mobile';
  } else {
    info.type = 'desktop';
  }

  // Detect OS
  if (/Windows/i.test(userAgent)) {
    info.os = 'Windows';
  } else if (/Mac OS X/i.test(userAgent)) {
    info.os = 'macOS';
  } else if (/Linux/i.test(userAgent)) {
    info.os = 'Linux';
  } else if (/Android/i.test(userAgent)) {
    info.os = 'Android';
  } else if (/iOS|iPhone|iPad/i.test(userAgent)) {
    info.os = 'iOS';
  }

  // Detect browser
  if (/Chrome/i.test(userAgent) && !/Edge/i.test(userAgent)) {
    info.browser = 'Chrome';
  } else if (/Firefox/i.test(userAgent)) {
    info.browser = 'Firefox';
  } else if (/Safari/i.test(userAgent) && !/Chrome/i.test(userAgent)) {
    info.browser = 'Safari';
  } else if (/Edge/i.test(userAgent)) {
    info.browser = 'Edge';
  }

  // Generate friendly name
  if (info.browser && info.os) {
    info.name = `${info.browser} on ${info.os}`;
  } else if (info.os) {
    info.name = info.os;
  }

  return info;
}

/**
 * Create a new session
 */
async function createSession(userId, req, additionalInfo = {}) {
  const userAgent = req.headers?.['user-agent'] || additionalInfo.userAgent || '';
  const ipAddress = req.ip || additionalInfo.ip || 'unknown';
  const deviceInfo = parseDeviceInfo(userAgent);
  const fingerprintHash = generateDeviceFingerprint(userAgent, ipAddress, additionalInfo);

  // Check for existing session with same fingerprint
  const existingSessionId = deviceFingerprints.get(fingerprintHash);
  if (existingSessionId) {
    const existingSession = sessions.get(existingSessionId);
    if (existingSession && existingSession.userId === userId) {
      // Update existing session
      return await touchSession(existingSessionId);
    }
  }

  // Check session limit
  const currentSessions = userSessions.get(userId) || new Set();
  if (currentSessions.size >= SESSION_CONFIG.maxConcurrentSessions) {
    // Revoke oldest session
    const sessionsArray = Array.from(currentSessions)
      .map(id => sessions.get(id))
      .filter(Boolean)
      .sort((a, b) => a.lastActiveAt - b.lastActiveAt);

    if (sessionsArray.length > 0) {
      await revokeSession(sessionsArray[0].id, 'new_session_limit');
    }
  }

  const now = Date.now();
  const sessionId = crypto.randomBytes(32).toString('hex');

  const session = {
    id: sessionId,
    userId,
    deviceInfo,
    ipAddress,
    userAgent,
    fingerprintHash,
    createdAt: now,
    lastActiveAt: now,
    expiresAt: now + SESSION_CONFIG.sessionAbsoluteTimeout,
  };

  // Store in memory
  sessions.set(sessionId, session);
  if (!userSessions.has(userId)) {
    userSessions.set(userId, new Set());
  }
  userSessions.get(userId).add(sessionId);
  deviceFingerprints.set(fingerprintHash, sessionId);

  // Persist to database
  await saveSession(session);

  logger.info('Session created', { userId, sessionId: sessionId.substring(0, 8), device: deviceInfo.name });

  return session;
}

/**
 * Save session to database
 */
async function saveSession(session) {
  if (!db) return;

  try {
    const deviceInfoStr = JSON.stringify(session.deviceInfo);

    if (isPostgres) {
      await db.query(
        `INSERT INTO user_sessions (id, user_id, device_info, ip_address, user_agent, fingerprint_hash, created_at, last_active_at, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO UPDATE SET
           last_active_at = EXCLUDED.last_active_at,
           expires_at = EXCLUDED.expires_at`,
        [session.id, session.userId, deviceInfoStr, session.ipAddress, session.userAgent,
         session.fingerprintHash, session.createdAt, session.lastActiveAt, session.expiresAt]
      );
    } else {
      db.prepare(
        `INSERT OR REPLACE INTO user_sessions (id, user_id, device_info, ip_address, user_agent, fingerprint_hash, created_at, last_active_at, expires_at, revoked)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`
      ).run(session.id, session.userId, deviceInfoStr, session.ipAddress, session.userAgent,
        session.fingerprintHash, session.createdAt, session.lastActiveAt, session.expiresAt);
    }
  } catch (error) {
    logger.error('Failed to save session:', error);
  }
}

/**
 * Touch a session (update last active time)
 */
async function touchSession(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) return null;

  const now = Date.now();

  // Check if session has expired
  if (now > session.expiresAt) {
    await revokeSession(sessionId, 'expired');
    return null;
  }

  // Check idle timeout
  if (now - session.lastActiveAt > SESSION_CONFIG.sessionIdleTimeout) {
    await revokeSession(sessionId, 'idle_timeout');
    return null;
  }

  session.lastActiveAt = now;
  sessions.set(sessionId, session);

  // Update database periodically (every 5 minutes to reduce writes)
  if (now - (session.lastDbUpdate || 0) > 5 * 60 * 1000) {
    session.lastDbUpdate = now;
    await saveSession(session);
  }

  return session;
}

/**
 * Validate a session
 */
async function validateSession(sessionId) {
  return await touchSession(sessionId);
}

/**
 * Revoke a session
 */
async function revokeSession(sessionId, reason = 'manual') {
  const session = sessions.get(sessionId);
  if (!session) return false;

  // Remove from memory
  sessions.delete(sessionId);
  const userSessionSet = userSessions.get(session.userId);
  if (userSessionSet) {
    userSessionSet.delete(sessionId);
    if (userSessionSet.size === 0) {
      userSessions.delete(session.userId);
    }
  }
  if (session.fingerprintHash) {
    deviceFingerprints.delete(session.fingerprintHash);
  }

  // Update database
  if (db) {
    try {
      if (isPostgres) {
        await db.query(
          'UPDATE user_sessions SET revoked = TRUE, revoked_reason = $1 WHERE id = $2',
          [reason, sessionId]
        );
      } else {
        db.prepare('UPDATE user_sessions SET revoked = 1, revoked_reason = ? WHERE id = ?')
          .run(reason, sessionId);
      }
    } catch (error) {
      logger.error('Failed to revoke session in database:', error);
    }
  }

  logger.info('Session revoked', { sessionId: sessionId.substring(0, 8), reason });
  return true;
}

/**
 * Revoke all sessions for a user
 */
async function revokeAllUserSessions(userId, reason = 'logout_all', exceptSessionId = null) {
  const sessionIds = userSessions.get(userId);
  if (!sessionIds) return 0;

  let count = 0;
  for (const sessionId of sessionIds) {
    if (sessionId !== exceptSessionId) {
      await revokeSession(sessionId, reason);
      count++;
    }
  }

  logger.info('All user sessions revoked', { userId, count, reason });
  return count;
}

/**
 * Get all active sessions for a user
 */
function getUserSessions(userId) {
  const sessionIds = userSessions.get(userId);
  if (!sessionIds) return [];

  return Array.from(sessionIds)
    .map(id => sessions.get(id))
    .filter(Boolean)
    .map(session => ({
      id: session.id.substring(0, 8) + '...',
      deviceInfo: session.deviceInfo,
      ipAddress: session.ipAddress,
      createdAt: session.createdAt,
      lastActiveAt: session.lastActiveAt,
      isCurrent: false, // Will be set by caller
    }))
    .sort((a, b) => b.lastActiveAt - a.lastActiveAt);
}

/**
 * Get session count for a user
 */
function getUserSessionCount(userId) {
  const sessionIds = userSessions.get(userId);
  return sessionIds ? sessionIds.size : 0;
}

/**
 * Check if a session exists for a device
 */
function hasSessionForDevice(userId, fingerprintHash) {
  const sessionId = deviceFingerprints.get(fingerprintHash);
  if (!sessionId) return false;

  const session = sessions.get(sessionId);
  return session && session.userId === userId;
}

/**
 * Cleanup expired sessions
 */
async function cleanupExpiredSessions() {
  const now = Date.now();
  let cleaned = 0;

  for (const [sessionId, session] of sessions) {
    if (now > session.expiresAt || now - session.lastActiveAt > SESSION_CONFIG.sessionIdleTimeout) {
      await revokeSession(sessionId, 'cleanup');
      cleaned++;
    }
  }

  // Also cleanup old revoked sessions from database
  if (db) {
    try {
      const cutoff = now - (7 * 24 * 60 * 60 * 1000); // 7 days ago
      if (isPostgres) {
        await db.query('DELETE FROM user_sessions WHERE revoked = TRUE AND last_active_at < $1', [cutoff]);
      } else {
        db.prepare('DELETE FROM user_sessions WHERE revoked = 1 AND last_active_at < ?').run(cutoff);
      }
    } catch (error) {
      logger.error('Failed to cleanup old sessions:', error);
    }
  }

  if (cleaned > 0) {
    logger.debug(`Cleaned up ${cleaned} expired sessions`);
  }
}

/**
 * Get session statistics
 */
function getStats() {
  return {
    totalSessions: sessions.size,
    totalUsers: userSessions.size,
    config: SESSION_CONFIG,
  };
}

// Start cleanup interval
setInterval(cleanupExpiredSessions, SESSION_CONFIG.cleanupInterval);

export const sessionManager = {
  init: initDatabase,
  createSession,
  validateSession,
  touchSession,
  revokeSession,
  revokeAllUserSessions,
  getUserSessions,
  getUserSessionCount,
  hasSessionForDevice,
  generateDeviceFingerprint,
  parseDeviceInfo,
  getStats,
  config: SESSION_CONFIG,
};

export default sessionManager;
