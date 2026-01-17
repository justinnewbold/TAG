/**
 * Query Optimizer Utilities
 * Provides query batching, caching, and performance optimizations
 */

import { logger } from './logger.js';

// Simple in-memory cache with TTL
class QueryCache {
  constructor(defaultTTL = 30000) { // 30 second default TTL
    this.cache = new Map();
    this.defaultTTL = defaultTTL;
    this.hits = 0;
    this.misses = 0;

    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => this._cleanup(), 60000);
  }

  _cleanup() {
    const now = Date.now();
    let cleaned = 0;
    for (const [key, entry] of this.cache) {
      if (entry.expires < now) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    if (cleaned > 0) {
      logger.debug(`QueryCache: Cleaned ${cleaned} expired entries`);
    }
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }
    if (entry.expires < Date.now()) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }
    this.hits++;
    return entry.value;
  }

  set(key, value, ttl = this.defaultTTL) {
    this.cache.set(key, {
      value,
      expires: Date.now() + ttl,
    });
  }

  invalidate(pattern) {
    if (typeof pattern === 'string') {
      this.cache.delete(pattern);
    } else if (pattern instanceof RegExp) {
      for (const key of this.cache.keys()) {
        if (pattern.test(key)) {
          this.cache.delete(key);
        }
      }
    }
  }

  clear() {
    this.cache.clear();
  }

  getStats() {
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: this.hits + this.misses > 0
        ? (this.hits / (this.hits + this.misses) * 100).toFixed(2) + '%'
        : 'N/A',
    };
  }

  destroy() {
    clearInterval(this.cleanupInterval);
    this.cache.clear();
  }
}

// Query batcher for combining multiple queries
class QueryBatcher {
  constructor(executor, options = {}) {
    this.executor = executor;
    this.batchDelay = options.batchDelay || 10; // ms to wait before executing batch
    this.maxBatchSize = options.maxBatchSize || 100;
    this.pending = new Map();
    this.timer = null;
  }

  // Add a query to the batch
  add(key, query, params) {
    return new Promise((resolve, reject) => {
      const existing = this.pending.get(key);
      if (existing) {
        // Already have this query pending, reuse the promise
        existing.resolvers.push({ resolve, reject });
        return;
      }

      this.pending.set(key, {
        query,
        params,
        resolvers: [{ resolve, reject }],
      });

      this._scheduleBatch();
    });
  }

  _scheduleBatch() {
    if (this.timer) return;

    this.timer = setTimeout(() => {
      this._executeBatch();
      this.timer = null;
    }, this.batchDelay);
  }

  async _executeBatch() {
    if (this.pending.size === 0) return;

    const batch = new Map(this.pending);
    this.pending.clear();

    // Execute all queries in parallel
    const results = await Promise.allSettled(
      Array.from(batch.entries()).map(async ([key, { query, params, resolvers }]) => {
        try {
          const result = await this.executor(query, params);
          resolvers.forEach(r => r.resolve(result));
        } catch (error) {
          resolvers.forEach(r => r.reject(error));
        }
      })
    );

    logger.debug(`QueryBatcher: Executed ${batch.size} queries in batch`);
  }
}

// Prepared statement cache for SQLite
class PreparedStatementCache {
  constructor(db) {
    this.db = db;
    this.statements = new Map();
  }

  get(sql) {
    let stmt = this.statements.get(sql);
    if (!stmt) {
      stmt = this.db.prepare(sql);
      this.statements.set(sql, stmt);
    }
    return stmt;
  }

  clear() {
    // SQLite statements don't need explicit cleanup in better-sqlite3
    this.statements.clear();
  }
}

// Query builder with optimizations
class OptimizedQueryBuilder {
  constructor() {
    this.query = '';
    this.params = [];
    this.hints = [];
  }

  select(columns) {
    this.query = `SELECT ${Array.isArray(columns) ? columns.join(', ') : columns}`;
    return this;
  }

  from(table) {
    this.query += ` FROM ${table}`;
    return this;
  }

  where(condition, ...params) {
    this.query += ` WHERE ${condition}`;
    this.params.push(...params);
    return this;
  }

  and(condition, ...params) {
    this.query += ` AND ${condition}`;
    this.params.push(...params);
    return this;
  }

  or(condition, ...params) {
    this.query += ` OR ${condition}`;
    this.params.push(...params);
    return this;
  }

  orderBy(column, direction = 'ASC') {
    this.query += ` ORDER BY ${column} ${direction}`;
    return this;
  }

  limit(count, offset = 0) {
    this.query += ` LIMIT ${count}`;
    if (offset > 0) {
      this.query += ` OFFSET ${offset}`;
    }
    return this;
  }

  // PostgreSQL-specific: Add query hints
  withHint(hint) {
    this.hints.push(hint);
    return this;
  }

  build() {
    let finalQuery = this.query;
    if (this.hints.length > 0) {
      // PostgreSQL query hints
      finalQuery = `/*+ ${this.hints.join(' ')} */ ${finalQuery}`;
    }
    return { query: finalQuery, params: this.params };
  }
}

// Common query patterns optimized
const optimizedQueries = {
  // Get active game with players (single query instead of N+1)
  getGameWithPlayers: `
    SELECT
      g.*,
      json_agg(
        json_build_object(
          'id', gp.user_id,
          'name', u.name,
          'avatar', u.avatar,
          'is_it', gp.is_it,
          'joined_at', gp.joined_at
        )
      ) FILTER (WHERE gp.left_at IS NULL) as players
    FROM games g
    LEFT JOIN game_players gp ON g.id = gp.game_id
    LEFT JOIN users u ON gp.user_id = u.id
    WHERE g.id = $1
    GROUP BY g.id
  `,

  // Get user with stats (single query)
  getUserWithStats: `
    SELECT
      u.*,
      us.total_tags,
      us.times_tagged,
      us.games_played,
      us.games_won,
      us.total_time_as_it,
      us.longest_streak
    FROM users u
    LEFT JOIN user_stats us ON u.id = us.user_id
    WHERE u.id = $1
  `,

  // Get leaderboard with ranking
  getLeaderboardRanked: `
    SELECT
      u.id,
      u.name,
      u.avatar,
      us.total_tags,
      us.games_won,
      us.games_played,
      ROW_NUMBER() OVER (ORDER BY us.total_tags DESC) as rank
    FROM users u
    JOIN user_stats us ON u.id = us.user_id
    WHERE us.games_played > 0
    ORDER BY us.total_tags DESC
    LIMIT $1 OFFSET $2
  `,

  // Get user's friends with presence
  getFriendsWithPresence: `
    SELECT
      u.id,
      u.name,
      u.avatar,
      up.status,
      up.last_active,
      up.current_game_id
    FROM friendships f
    JOIN users u ON f.friend_id = u.id
    LEFT JOIN user_presence up ON u.id = up.user_id
    WHERE f.user_id = $1 AND f.status = 'accepted'
    ORDER BY up.last_active DESC NULLS LAST
  `,

  // Get recent game history with stats
  getGameHistory: `
    SELECT
      g.id,
      g.code,
      g.status,
      g.started_at,
      g.ended_at,
      g.settings,
      gp.is_it as was_it,
      (SELECT COUNT(*) FROM game_tags WHERE tagger_id = $1 AND game_id = g.id) as tags_made,
      (SELECT COUNT(*) FROM game_tags WHERE tagged_id = $1 AND game_id = g.id) as times_tagged
    FROM games g
    JOIN game_players gp ON g.id = gp.game_id AND gp.user_id = $1
    WHERE g.status = 'completed'
    ORDER BY g.ended_at DESC
    LIMIT $2 OFFSET $3
  `,
};

// SQLite versions of optimized queries
const optimizedQueriesSqlite = {
  getGameWithPlayers: `
    SELECT
      g.*,
      (
        SELECT json_group_array(
          json_object(
            'id', gp.user_id,
            'name', u.name,
            'avatar', u.avatar,
            'is_it', gp.is_it,
            'joined_at', gp.joined_at
          )
        )
        FROM game_players gp
        JOIN users u ON gp.user_id = u.id
        WHERE gp.game_id = g.id AND gp.left_at IS NULL
      ) as players
    FROM games g
    WHERE g.id = ?
  `,

  getUserWithStats: `
    SELECT
      u.*,
      us.total_tags,
      us.times_tagged,
      us.games_played,
      us.games_won,
      us.total_time_as_it,
      us.longest_streak
    FROM users u
    LEFT JOIN user_stats us ON u.id = us.user_id
    WHERE u.id = ?
  `,

  getLeaderboardRanked: `
    SELECT
      u.id,
      u.name,
      u.avatar,
      us.total_tags,
      us.games_won,
      us.games_played,
      (
        SELECT COUNT(*) + 1
        FROM user_stats us2
        WHERE us2.total_tags > us.total_tags
      ) as rank
    FROM users u
    JOIN user_stats us ON u.id = us.user_id
    WHERE us.games_played > 0
    ORDER BY us.total_tags DESC
    LIMIT ? OFFSET ?
  `,
};

// Create singleton instances
const queryCache = new QueryCache();

export {
  QueryCache,
  QueryBatcher,
  PreparedStatementCache,
  OptimizedQueryBuilder,
  optimizedQueries,
  optimizedQueriesSqlite,
  queryCache,
};

export default {
  QueryCache,
  QueryBatcher,
  PreparedStatementCache,
  OptimizedQueryBuilder,
  optimizedQueries,
  optimizedQueriesSqlite,
  queryCache,
};
