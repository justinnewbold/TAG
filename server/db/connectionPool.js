/**
 * Database Connection Pool and Health Management
 * Provides connection pooling, health checks, and circuit breaker pattern
 */

import { logger } from '../utils/logger.js';

// Circuit breaker states
const CircuitState = {
  CLOSED: 'closed',     // Normal operation
  OPEN: 'open',         // Failing, reject requests
  HALF_OPEN: 'half_open', // Testing if service recovered
};

/**
 * Circuit Breaker for database connections
 */
class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 30000; // 30 seconds
    this.halfOpenMaxAttempts = options.halfOpenMaxAttempts || 3;

    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.lastFailure = null;
    this.halfOpenAttempts = 0;
  }

  async execute(fn) {
    if (this.state === CircuitState.OPEN) {
      // Check if we should try half-open
      if (Date.now() - this.lastFailure > this.resetTimeout) {
        this.state = CircuitState.HALF_OPEN;
        this.halfOpenAttempts = 0;
        logger.info('Circuit breaker entering half-open state');
      } else {
        throw new Error('Circuit breaker is OPEN - database unavailable');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    if (this.state === CircuitState.HALF_OPEN) {
      this.halfOpenAttempts++;
      if (this.halfOpenAttempts >= this.halfOpenMaxAttempts) {
        this.state = CircuitState.CLOSED;
        this.failures = 0;
        logger.info('Circuit breaker closed - database recovered');
      }
    } else {
      this.failures = 0;
    }
  }

  onFailure() {
    this.failures++;
    this.lastFailure = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.OPEN;
      logger.warn('Circuit breaker reopened after half-open failure');
    } else if (this.failures >= this.failureThreshold) {
      this.state = CircuitState.OPEN;
      logger.error('Circuit breaker OPEN - too many database failures', {
        failures: this.failures,
      });
    }
  }

  getState() {
    return {
      state: this.state,
      failures: this.failures,
      lastFailure: this.lastFailure,
    };
  }

  reset() {
    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.lastFailure = null;
  }
}

/**
 * PostgreSQL Connection Pool Manager
 */
class PostgresPoolManager {
  constructor() {
    this.pool = null;
    this.circuitBreaker = new CircuitBreaker();
    this.healthCheckInterval = null;
    this.config = null;
    this.stats = {
      totalConnections: 0,
      activeConnections: 0,
      idleConnections: 0,
      waitingClients: 0,
      queriesExecuted: 0,
      errors: 0,
    };
  }

  async initialize(config) {
    this.config = {
      host: config.host || 'localhost',
      port: config.port || 5432,
      database: config.database || 'tag_game',
      user: config.user || 'postgres',
      password: config.password,

      // Pool settings
      min: config.min || 2,
      max: config.max || 20,
      idleTimeoutMillis: config.idleTimeoutMillis || 30000,
      connectionTimeoutMillis: config.connectionTimeoutMillis || 5000,
      maxUses: config.maxUses || 7500, // Recycle connections after N uses

      // Statement timeout
      statement_timeout: config.statement_timeout || 30000,
    };

    try {
      // Dynamic import for pg
      const pg = await import('pg');
      this.pool = new pg.default.Pool(this.config);

      // Set up event handlers
      this.pool.on('connect', () => {
        this.stats.totalConnections++;
        logger.debug('New database connection established');
      });

      this.pool.on('acquire', () => {
        this.stats.activeConnections++;
      });

      this.pool.on('release', () => {
        this.stats.activeConnections--;
      });

      this.pool.on('error', (err) => {
        this.stats.errors++;
        logger.error('Database pool error', { error: err.message });
      });

      // Test connection
      await this.healthCheck();

      // Start periodic health checks
      this.startHealthChecks();

      logger.info('PostgreSQL connection pool initialized', {
        min: this.config.min,
        max: this.config.max,
      });

      return true;
    } catch (error) {
      logger.error('Failed to initialize PostgreSQL pool', { error: error.message });
      throw error;
    }
  }

  async query(text, params) {
    return this.circuitBreaker.execute(async () => {
      const start = Date.now();
      try {
        const result = await this.pool.query(text, params);
        this.stats.queriesExecuted++;

        // Log slow queries
        const duration = Date.now() - start;
        if (duration > 1000) {
          logger.warn('Slow query detected', {
            duration,
            query: text.substring(0, 100),
          });
        }

        return result;
      } catch (error) {
        this.stats.errors++;
        throw error;
      }
    });
  }

  async getClient() {
    return this.circuitBreaker.execute(async () => {
      const client = await this.pool.connect();

      // Wrap release to track stats
      const originalRelease = client.release.bind(client);
      client.release = () => {
        originalRelease();
      };

      return client;
    });
  }

  async healthCheck() {
    try {
      const result = await this.pool.query('SELECT 1 as health');
      return result.rows[0].health === 1;
    } catch (error) {
      logger.error('Database health check failed', { error: error.message });
      return false;
    }
  }

  startHealthChecks(interval = 30000) {
    this.stopHealthChecks();
    this.healthCheckInterval = setInterval(async () => {
      const healthy = await this.healthCheck();
      if (!healthy) {
        this.circuitBreaker.onFailure();
      }
      this.updateStats();
    }, interval);
  }

  stopHealthChecks() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  updateStats() {
    if (this.pool) {
      this.stats.idleConnections = this.pool.idleCount;
      this.stats.waitingClients = this.pool.waitingCount;
      this.stats.totalConnections = this.pool.totalCount;
    }
  }

  getStats() {
    this.updateStats();
    return {
      ...this.stats,
      circuitBreaker: this.circuitBreaker.getState(),
    };
  }

  async close() {
    this.stopHealthChecks();
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
    logger.info('PostgreSQL connection pool closed');
  }
}

/**
 * SQLite Connection Manager (with WAL mode for better concurrency)
 */
class SQLiteManager {
  constructor() {
    this.db = null;
    this.circuitBreaker = new CircuitBreaker();
    this.stats = {
      queriesExecuted: 0,
      errors: 0,
    };
  }

  async initialize(dbPath) {
    try {
      // Dynamic import for better-sqlite3
      const Database = (await import('better-sqlite3')).default;
      this.db = new Database(dbPath);

      // Enable WAL mode for better concurrency
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('synchronous = NORMAL');
      this.db.pragma('cache_size = 10000');
      this.db.pragma('temp_store = MEMORY');

      // Foreign keys
      this.db.pragma('foreign_keys = ON');

      logger.info('SQLite database initialized with WAL mode', { path: dbPath });
      return true;
    } catch (error) {
      logger.error('Failed to initialize SQLite', { error: error.message });
      throw error;
    }
  }

  exec(sql) {
    return this.circuitBreaker.execute(() => {
      try {
        this.db.exec(sql);
        this.stats.queriesExecuted++;
      } catch (error) {
        this.stats.errors++;
        throw error;
      }
    });
  }

  prepare(sql) {
    return this.db.prepare(sql);
  }

  healthCheck() {
    try {
      const result = this.db.prepare('SELECT 1 as health').get();
      return result.health === 1;
    } catch (error) {
      logger.error('SQLite health check failed', { error: error.message });
      return false;
    }
  }

  getStats() {
    return {
      ...this.stats,
      circuitBreaker: this.circuitBreaker.getState(),
    };
  }

  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    logger.info('SQLite database closed');
  }
}

/**
 * Database Health Monitor
 */
class DatabaseHealthMonitor {
  constructor(dbManager, isPostgres) {
    this.dbManager = dbManager;
    this.isPostgres = isPostgres;
    this.lastCheck = null;
    this.lastStatus = null;
  }

  async check() {
    const start = Date.now();

    try {
      const healthy = await this.dbManager.healthCheck();
      const duration = Date.now() - start;

      this.lastCheck = Date.now();
      this.lastStatus = {
        healthy,
        latency: duration,
        timestamp: this.lastCheck,
      };

      return this.lastStatus;
    } catch (error) {
      this.lastStatus = {
        healthy: false,
        error: error.message,
        timestamp: Date.now(),
      };
      return this.lastStatus;
    }
  }

  async getDetailedStatus() {
    const basicStatus = await this.check();
    const stats = this.dbManager.getStats();

    return {
      ...basicStatus,
      type: this.isPostgres ? 'postgresql' : 'sqlite',
      stats,
    };
  }
}

// Singleton instances
let postgresPool = null;
let sqliteManager = null;
let healthMonitor = null;

/**
 * Initialize database with connection pooling
 */
export async function initializeDatabase(config = {}) {
  const isPostgres = !!process.env.DATABASE_URL || config.postgres;

  if (isPostgres) {
    postgresPool = new PostgresPoolManager();
    await postgresPool.initialize({
      connectionString: process.env.DATABASE_URL,
      ...config,
    });
    healthMonitor = new DatabaseHealthMonitor(postgresPool, true);
    return { pool: postgresPool, isPostgres: true };
  } else {
    sqliteManager = new SQLiteManager();
    await sqliteManager.initialize(config.dbPath || './tag-game.db');
    healthMonitor = new DatabaseHealthMonitor(sqliteManager, false);
    return { db: sqliteManager, isPostgres: false };
  }
}

/**
 * Get database health status
 */
export async function getDatabaseHealth() {
  if (healthMonitor) {
    return healthMonitor.getDetailedStatus();
  }
  return { healthy: false, error: 'Database not initialized' };
}

/**
 * Get database statistics
 */
export function getDatabaseStats() {
  if (postgresPool) {
    return postgresPool.getStats();
  }
  if (sqliteManager) {
    return sqliteManager.getStats();
  }
  return null;
}

export {
  CircuitBreaker,
  PostgresPoolManager,
  SQLiteManager,
  DatabaseHealthMonitor,
};

export default {
  initializeDatabase,
  getDatabaseHealth,
  getDatabaseStats,
  CircuitBreaker,
};
