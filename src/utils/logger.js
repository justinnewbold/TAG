/**
 * Structured Logging Utility
 * Provides consistent logging with levels, timestamps, and context
 * Only logs in development mode unless configured otherwise
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4,
};

// Get log level from environment or default to WARN in production
const getLogLevel = () => {
  if (import.meta.env.DEV) {
    return LOG_LEVELS.DEBUG;
  }
  return LOG_LEVELS.ERROR; // Only errors in production
};

let currentLogLevel = getLogLevel();

// Log buffer for recent logs (useful for error reporting)
const LOG_BUFFER_SIZE = 100;
let logBuffer = [];

// Format timestamp
const formatTimestamp = () => {
  const now = new Date();
  return now.toISOString().slice(11, 23); // HH:mm:ss.SSS
};

// Format log entry
const formatLogEntry = (level, context, message, data) => {
  return {
    timestamp: formatTimestamp(),
    level,
    context,
    message,
    data,
  };
};

// Add to buffer
const addToBuffer = (entry) => {
  logBuffer.push(entry);
  if (logBuffer.length > LOG_BUFFER_SIZE) {
    logBuffer.shift();
  }
};

// Core log function
const log = (level, levelName, context, message, data = null) => {
  if (level < currentLogLevel) return;

  const entry = formatLogEntry(levelName, context, message, data);
  addToBuffer(entry);

  const prefix = `[${entry.timestamp}] [${levelName}]${context ? ` [${context}]` : ''}`;
  const formattedMessage = `${prefix} ${message}`;

  switch (level) {
    case LOG_LEVELS.DEBUG:
      if (data) {
        console.debug(formattedMessage, data);
      } else {
        console.debug(formattedMessage);
      }
      break;
    case LOG_LEVELS.INFO:
      if (data) {
        console.info(formattedMessage, data);
      } else {
        console.info(formattedMessage);
      }
      break;
    case LOG_LEVELS.WARN:
      if (data) {
        console.warn(formattedMessage, data);
      } else {
        console.warn(formattedMessage);
      }
      break;
    case LOG_LEVELS.ERROR:
      if (data) {
        console.error(formattedMessage, data);
      } else {
        console.error(formattedMessage);
      }
      break;
  }
};

// Public logging API
export const logger = {
  /**
   * Debug level logging - only in development
   */
  debug: (context, message, data) => {
    log(LOG_LEVELS.DEBUG, 'DEBUG', context, message, data);
  },

  /**
   * Info level logging
   */
  info: (context, message, data) => {
    log(LOG_LEVELS.INFO, 'INFO', context, message, data);
  },

  /**
   * Warning level logging
   */
  warn: (context, message, data) => {
    log(LOG_LEVELS.WARN, 'WARN', context, message, data);
  },

  /**
   * Error level logging
   */
  error: (context, message, data) => {
    log(LOG_LEVELS.ERROR, 'ERROR', context, message, data);
  },

  /**
   * Create a scoped logger for a specific context
   */
  scope: (context) => ({
    debug: (message, data) => logger.debug(context, message, data),
    info: (message, data) => logger.info(context, message, data),
    warn: (message, data) => logger.warn(context, message, data),
    error: (message, data) => logger.error(context, message, data),
  }),

  /**
   * Set the current log level
   */
  setLevel: (level) => {
    if (LOG_LEVELS[level] !== undefined) {
      currentLogLevel = LOG_LEVELS[level];
    }
  },

  /**
   * Get recent logs from buffer
   */
  getRecentLogs: (count = 50) => {
    return logBuffer.slice(-count);
  },

  /**
   * Clear log buffer
   */
  clearBuffer: () => {
    logBuffer = [];
  },

  /**
   * Get logs as string (useful for error reports)
   */
  getLogsAsString: (count = 50) => {
    return logger.getRecentLogs(count)
      .map(entry => `[${entry.timestamp}] [${entry.level}] ${entry.context ? `[${entry.context}] ` : ''}${entry.message}${entry.data ? ' ' + JSON.stringify(entry.data) : ''}`)
      .join('\n');
  },

  /**
   * Log levels enum
   */
  levels: LOG_LEVELS,
};

// Create scoped loggers for common contexts
export const serviceLogger = logger.scope('Service');
export const socketLogger = logger.scope('Socket');
export const storeLogger = logger.scope('Store');
export const gameLogger = logger.scope('Game');
export const authLogger = logger.scope('Auth');
export const locationLogger = logger.scope('Location');

export default logger;
