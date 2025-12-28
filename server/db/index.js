import dotenv from 'dotenv';
dotenv.config();

const usePostgres = !!process.env.DATABASE_URL;

let db;
let userDb;
let gameDb;

if (usePostgres) {
  // PostgreSQL mode
  const pg = await import('pg');
  const { Pool } = pg.default;

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  db = pool;

  // Initialize PostgreSQL schema
  const initSchema = async () => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        avatar TEXT DEFAULT '😀',
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS user_stats (
        user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        games_played INTEGER DEFAULT 0,
        games_won INTEGER DEFAULT 0,
        total_tags INTEGER DEFAULT 0,
        times_tagged INTEGER DEFAULT 0,
        longest_survival BIGINT DEFAULT 0,
        total_play_time BIGINT DEFAULT 0,
        unique_friends_played INTEGER DEFAULT 0,
        fastest_tag BIGINT DEFAULT NULL,
        played_at_night BOOLEAN DEFAULT FALSE
      );

      CREATE TABLE IF NOT EXISTS user_achievements (
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        achievement_id TEXT NOT NULL,
        earned_at BIGINT NOT NULL,
        PRIMARY KEY (user_id, achievement_id)
      );

      CREATE TABLE IF NOT EXISTS games (
        id TEXT PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        host_id TEXT NOT NULL REFERENCES users(id),
        host_name TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'waiting',
        settings TEXT NOT NULL,
        it_player_id TEXT,
        started_at BIGINT,
        ended_at BIGINT,
        winner_id TEXT,
        winner_name TEXT,
        game_duration BIGINT,
        created_at BIGINT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS game_players (
        game_id TEXT REFERENCES games(id) ON DELETE CASCADE,
        user_id TEXT REFERENCES users(id),
        name TEXT NOT NULL,
        avatar TEXT,
        is_it BOOLEAN DEFAULT FALSE,
        joined_at BIGINT NOT NULL,
        tag_count INTEGER DEFAULT 0,
        survival_time BIGINT DEFAULT 0,
        became_it_at BIGINT,
        final_survival_time BIGINT DEFAULT 0,
        PRIMARY KEY (game_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS game_tags (
        id TEXT PRIMARY KEY,
        game_id TEXT REFERENCES games(id) ON DELETE CASCADE,
        tagger_id TEXT NOT NULL,
        tagged_id TEXT NOT NULL,
        timestamp BIGINT NOT NULL,
        tag_time BIGINT,
        location_lat DOUBLE PRECISION,
        location_lng DOUBLE PRECISION
      );

      CREATE INDEX IF NOT EXISTS idx_games_code ON games(code);
      CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
      CREATE INDEX IF NOT EXISTS idx_game_players_user ON game_players(user_id);
      CREATE INDEX IF NOT EXISTS idx_game_tags_game ON game_tags(game_id);
    `);
    console.log('PostgreSQL schema initialized');
  };

  await initSchema();

  // PostgreSQL User operations
  userDb = {
    async create(user) {
      const now = Date.now();
      await pool.query(
        `INSERT INTO users (id, name, avatar, created_at, updated_at) VALUES ($1, $2, $3, $4, $5)`,
        [user.id, user.name, user.avatar, now, now]
      );
      await pool.query(`INSERT INTO user_stats (user_id) VALUES ($1)`, [user.id]);
      return this.getById(user.id);
    },

    async getById(id) {
      const result = await pool.query(`
        SELECT u.*, s.games_played, s.games_won, s.total_tags, s.times_tagged,
               s.longest_survival, s.total_play_time, s.unique_friends_played,
               s.fastest_tag, s.played_at_night
        FROM users u
        LEFT JOIN user_stats s ON u.id = s.user_id
        WHERE u.id = $1
      `, [id]);

      if (result.rows.length === 0) return null;
      const user = result.rows[0];

      const achievementsResult = await pool.query(
        `SELECT achievement_id FROM user_achievements WHERE user_id = $1`,
        [id]
      );
      const achievements = achievementsResult.rows.map(a => a.achievement_id);

      return {
        id: user.id,
        name: user.name,
        avatar: user.avatar,
        email: user.email,
        emailVerified: !!user.email_verified,
        phone: user.phone,
        phoneVerified: !!user.phone_verified,
        authProvider: user.auth_provider,
        createdAt: parseInt(user.created_at),
        stats: {
          gamesPlayed: user.games_played,
          gamesWon: user.games_won,
          totalTags: user.total_tags,
          timesTagged: user.times_tagged,
          longestSurvival: parseInt(user.longest_survival) || 0,
          totalPlayTime: parseInt(user.total_play_time) || 0,
          uniqueFriendsPlayed: user.unique_friends_played,
          fastestTag: user.fastest_tag ? parseInt(user.fastest_tag) : null,
          playedAtNight: !!user.played_at_night,
        },
        achievements,
      };
    },

    async update(id, updates) {
      await pool.query(
        `UPDATE users SET name = $1, avatar = $2, updated_at = $3 WHERE id = $4`,
        [updates.name, updates.avatar, Date.now(), id]
      );
      return this.getById(id);
    },

    async updateStats(id, stats) {
      const updates = [];
      const values = [];
      let paramIndex = 1;

      if (stats.gamesPlayed !== undefined) { updates.push(`games_played = $${paramIndex++}`); values.push(stats.gamesPlayed); }
      if (stats.gamesWon !== undefined) { updates.push(`games_won = $${paramIndex++}`); values.push(stats.gamesWon); }
      if (stats.totalTags !== undefined) { updates.push(`total_tags = $${paramIndex++}`); values.push(stats.totalTags); }
      if (stats.timesTagged !== undefined) { updates.push(`times_tagged = $${paramIndex++}`); values.push(stats.timesTagged); }
      if (stats.longestSurvival !== undefined) { updates.push(`longest_survival = $${paramIndex++}`); values.push(stats.longestSurvival); }
      if (stats.totalPlayTime !== undefined) { updates.push(`total_play_time = $${paramIndex++}`); values.push(stats.totalPlayTime); }
      if (stats.uniqueFriendsPlayed !== undefined) { updates.push(`unique_friends_played = $${paramIndex++}`); values.push(stats.uniqueFriendsPlayed); }
      if (stats.fastestTag !== undefined) { updates.push(`fastest_tag = $${paramIndex++}`); values.push(stats.fastestTag); }
      if (stats.playedAtNight !== undefined) { updates.push(`played_at_night = $${paramIndex++}`); values.push(stats.playedAtNight); }

      if (updates.length === 0) return;

      values.push(id);
      await pool.query(`UPDATE user_stats SET ${updates.join(', ')} WHERE user_id = $${paramIndex}`, values);
    },

    async addAchievement(id, achievementId) {
      try {
        await pool.query(
          `INSERT INTO user_achievements (user_id, achievement_id, earned_at) VALUES ($1, $2, $3)`,
          [id, achievementId, Date.now()]
        );
        return true;
      } catch (e) {
        return false;
      }
    },

    async exists(id) {
      const result = await pool.query('SELECT 1 FROM users WHERE id = $1', [id]);
      return result.rows.length > 0;
    }
  };

  // PostgreSQL Game operations
  gameDb = {
    async create(game) {
      await pool.query(`
        INSERT INTO games (id, code, host_id, host_name, status, settings, it_player_id, started_at, ended_at, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        game.id, game.code, game.host, game.hostName, game.status,
        JSON.stringify(game.settings), game.itPlayerId, game.startedAt, game.endedAt, game.createdAt
      ]);
      await this.addPlayer(game.id, game.players[0]);
      return game;
    },

    async getById(id) {
      const result = await pool.query('SELECT * FROM games WHERE id = $1', [id]);
      if (result.rows.length === 0) return null;
      return this._hydrateGame(result.rows[0]);
    },

    async getByCode(code) {
      const result = await pool.query('SELECT * FROM games WHERE code = $1', [code.toUpperCase()]);
      if (result.rows.length === 0) return null;
      return this._hydrateGame(result.rows[0]);
    },

    async getActiveGameForPlayer(userId) {
      const result = await pool.query(`
        SELECT gp.game_id FROM game_players gp
        JOIN games g ON gp.game_id = g.id
        WHERE gp.user_id = $1 AND g.status IN ('waiting', 'active')
      `, [userId]);
      if (result.rows.length === 0) return null;
      return this.getById(result.rows[0].game_id);
    },

    async _hydrateGame(row) {
      const playersResult = await pool.query('SELECT * FROM game_players WHERE game_id = $1', [row.id]);
      const players = playersResult.rows.map(p => ({
        id: p.user_id,
        name: p.name,
        avatar: p.avatar,
        location: null,
        isIt: !!p.is_it,
        joinedAt: parseInt(p.joined_at),
        lastUpdate: null,
        tagCount: p.tag_count,
        survivalTime: parseInt(p.survival_time) || 0,
        becameItAt: p.became_it_at ? parseInt(p.became_it_at) : null,
        finalSurvivalTime: parseInt(p.final_survival_time) || 0,
      }));

      const tagsResult = await pool.query('SELECT * FROM game_tags WHERE game_id = $1', [row.id]);
      const tags = tagsResult.rows.map(t => ({
        id: t.id,
        taggerId: t.tagger_id,
        taggedId: t.tagged_id,
        timestamp: parseInt(t.timestamp),
        tagTime: t.tag_time ? parseInt(t.tag_time) : null,
        location: t.location_lat ? { lat: t.location_lat, lng: t.location_lng } : null,
      }));

      return {
        id: row.id,
        code: row.code,
        host: row.host_id,
        hostName: row.host_name,
        status: row.status,
        settings: JSON.parse(row.settings),
        players,
        itPlayerId: row.it_player_id,
        startedAt: row.started_at ? parseInt(row.started_at) : null,
        endedAt: row.ended_at ? parseInt(row.ended_at) : null,
        winnerId: row.winner_id,
        winnerName: row.winner_name,
        gameDuration: row.game_duration ? parseInt(row.game_duration) : null,
        tags,
        createdAt: parseInt(row.created_at),
      };
    },

    async addPlayer(gameId, player) {
      await pool.query(`
        INSERT INTO game_players (game_id, user_id, name, avatar, is_it, joined_at, tag_count, survival_time, became_it_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [gameId, player.id, player.name, player.avatar, player.isIt || false, player.joinedAt, player.tagCount || 0, player.survivalTime || 0, player.becameItAt]);
    },

    async removePlayer(gameId, userId) {
      await pool.query('DELETE FROM game_players WHERE game_id = $1 AND user_id = $2', [gameId, userId]);
    },

    async updateGame(game) {
      await pool.query(`
        UPDATE games SET
          host_id = $1, host_name = $2, status = $3, settings = $4,
          it_player_id = $5, started_at = $6, ended_at = $7,
          winner_id = $8, winner_name = $9, game_duration = $10
        WHERE id = $11
      `, [
        game.host, game.hostName, game.status, JSON.stringify(game.settings),
        game.itPlayerId, game.startedAt, game.endedAt,
        game.winnerId || null, game.winnerName || null, game.gameDuration || null, game.id
      ]);
    },

    async updatePlayer(gameId, player) {
      await pool.query(`
        UPDATE game_players SET
          is_it = $1, tag_count = $2, survival_time = $3, became_it_at = $4, final_survival_time = $5
        WHERE game_id = $6 AND user_id = $7
      `, [player.isIt || false, player.tagCount || 0, player.survivalTime || 0, player.becameItAt, player.finalSurvivalTime || 0, gameId, player.id]);
    },

    async addTag(gameId, tag) {
      await pool.query(`
        INSERT INTO game_tags (id, game_id, tagger_id, tagged_id, timestamp, tag_time, location_lat, location_lng)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [tag.id, gameId, tag.taggerId, tag.taggedId, tag.timestamp, tag.tagTime, tag.location?.lat, tag.location?.lng]);
    },

    async deleteGame(id) {
      await pool.query('DELETE FROM games WHERE id = $1', [id]);
    },

    async getPlayerHistory(userId, limit = 20) {
      const result = await pool.query(`
        SELECT g.* FROM games g
        JOIN game_players gp ON g.id = gp.game_id
        WHERE gp.user_id = $1 AND g.status = 'ended'
        ORDER BY g.ended_at DESC
        LIMIT $2
      `, [userId, limit]);
      return Promise.all(result.rows.map(g => this._hydrateGame(g)));
    },

    async cleanupOldGames(maxAgeMs = 7 * 24 * 60 * 60 * 1000) {
      const cutoff = Date.now() - maxAgeMs;
      await pool.query('DELETE FROM games WHERE status = $1 AND ended_at < $2', ['ended', cutoff]);
    }
  };

  console.log('Using PostgreSQL database');

} else {
  // SQLite mode (local development)
  let Database;
  try {
    Database = (await import('better-sqlite3')).default;
  } catch (e) {
    console.error('better-sqlite3 is not available. Set DATABASE_URL for PostgreSQL or install better-sqlite3 for local development.');
    console.error('Error:', e.message);
    process.exit(1);
  }
  const path = await import('path');
  const { fileURLToPath } = await import('url');
  const fs = await import('fs');

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '..', 'data', 'tag.db');

  const dataDir = path.dirname(dbPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const sqliteDb = new Database(dbPath);
  sqliteDb.pragma('journal_mode = WAL');
  sqliteDb.pragma('foreign_keys = ON');

  db = sqliteDb;

  // Initialize SQLite schema
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      avatar TEXT DEFAULT '😀',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_stats (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      games_played INTEGER DEFAULT 0,
      games_won INTEGER DEFAULT 0,
      total_tags INTEGER DEFAULT 0,
      times_tagged INTEGER DEFAULT 0,
      longest_survival INTEGER DEFAULT 0,
      total_play_time INTEGER DEFAULT 0,
      unique_friends_played INTEGER DEFAULT 0,
      fastest_tag INTEGER DEFAULT NULL,
      played_at_night INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS user_achievements (
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      achievement_id TEXT NOT NULL,
      earned_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, achievement_id)
    );

    CREATE TABLE IF NOT EXISTS games (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      host_id TEXT NOT NULL REFERENCES users(id),
      host_name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'waiting',
      settings TEXT NOT NULL,
      it_player_id TEXT,
      started_at INTEGER,
      ended_at INTEGER,
      winner_id TEXT,
      winner_name TEXT,
      game_duration INTEGER,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS game_players (
      game_id TEXT REFERENCES games(id) ON DELETE CASCADE,
      user_id TEXT REFERENCES users(id),
      name TEXT NOT NULL,
      avatar TEXT,
      is_it INTEGER DEFAULT 0,
      joined_at INTEGER NOT NULL,
      tag_count INTEGER DEFAULT 0,
      survival_time INTEGER DEFAULT 0,
      became_it_at INTEGER,
      final_survival_time INTEGER DEFAULT 0,
      PRIMARY KEY (game_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS game_tags (
      id TEXT PRIMARY KEY,
      game_id TEXT REFERENCES games(id) ON DELETE CASCADE,
      tagger_id TEXT NOT NULL,
      tagged_id TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      tag_time INTEGER,
      location_lat REAL,
      location_lng REAL
    );

    CREATE INDEX IF NOT EXISTS idx_games_code ON games(code);
    CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
    CREATE INDEX IF NOT EXISTS idx_game_players_user ON game_players(user_id);
    CREATE INDEX IF NOT EXISTS idx_game_tags_game ON game_tags(game_id);
  `);

  // SQLite User operations (synchronous, wrapped in promises for consistent API)
  userDb = {
    async create(user) {
      const stmt = sqliteDb.prepare(`
        INSERT INTO users (id, name, avatar, created_at, updated_at) VALUES (?, ?, ?, ?, ?)
      `);
      const statsStmt = sqliteDb.prepare(`INSERT INTO user_stats (user_id) VALUES (?)`);
      const now = Date.now();
      const transaction = sqliteDb.transaction(() => {
        stmt.run(user.id, user.name, user.avatar, now, now);
        statsStmt.run(user.id);
      });
      transaction();
      return this.getById(user.id);
    },

    async getById(id) {
      const user = sqliteDb.prepare(`
        SELECT u.*, s.games_played, s.games_won, s.total_tags, s.times_tagged,
               s.longest_survival, s.total_play_time, s.unique_friends_played,
               s.fastest_tag, s.played_at_night
        FROM users u LEFT JOIN user_stats s ON u.id = s.user_id WHERE u.id = ?
      `).get(id);

      if (!user) return null;

      const achievements = sqliteDb.prepare(
        `SELECT achievement_id FROM user_achievements WHERE user_id = ?`
      ).all(id).map(a => a.achievement_id);

      return {
        id: user.id, name: user.name, avatar: user.avatar,
        email: user.email,
        emailVerified: !!user.email_verified,
        phone: user.phone,
        phoneVerified: !!user.phone_verified,
        authProvider: user.auth_provider,
        createdAt: user.created_at,
        stats: {
          gamesPlayed: user.games_played, gamesWon: user.games_won,
          totalTags: user.total_tags, timesTagged: user.times_tagged,
          longestSurvival: user.longest_survival, totalPlayTime: user.total_play_time,
          uniqueFriendsPlayed: user.unique_friends_played, fastestTag: user.fastest_tag,
          playedAtNight: !!user.played_at_night,
        },
        achievements,
      };
    },

    async update(id, updates) {
      sqliteDb.prepare(`UPDATE users SET name = ?, avatar = ?, updated_at = ? WHERE id = ?`)
        .run(updates.name, updates.avatar, Date.now(), id);
      return this.getById(id);
    },

    async updateStats(id, stats) {
      const existing = sqliteDb.prepare('SELECT * FROM user_stats WHERE user_id = ?').get(id);
      if (!existing) return;
      const updates = []; const values = [];
      if (stats.gamesPlayed !== undefined) { updates.push('games_played = ?'); values.push(stats.gamesPlayed); }
      if (stats.gamesWon !== undefined) { updates.push('games_won = ?'); values.push(stats.gamesWon); }
      if (stats.totalTags !== undefined) { updates.push('total_tags = ?'); values.push(stats.totalTags); }
      if (stats.timesTagged !== undefined) { updates.push('times_tagged = ?'); values.push(stats.timesTagged); }
      if (stats.longestSurvival !== undefined) { updates.push('longest_survival = ?'); values.push(stats.longestSurvival); }
      if (stats.totalPlayTime !== undefined) { updates.push('total_play_time = ?'); values.push(stats.totalPlayTime); }
      if (stats.uniqueFriendsPlayed !== undefined) { updates.push('unique_friends_played = ?'); values.push(stats.uniqueFriendsPlayed); }
      if (stats.fastestTag !== undefined) { updates.push('fastest_tag = ?'); values.push(stats.fastestTag); }
      if (stats.playedAtNight !== undefined) { updates.push('played_at_night = ?'); values.push(stats.playedAtNight ? 1 : 0); }
      if (updates.length === 0) return;
      values.push(id);
      sqliteDb.prepare(`UPDATE user_stats SET ${updates.join(', ')} WHERE user_id = ?`).run(...values);
    },

    async addAchievement(id, achievementId) {
      try {
        sqliteDb.prepare(`INSERT INTO user_achievements (user_id, achievement_id, earned_at) VALUES (?, ?, ?)`)
          .run(id, achievementId, Date.now());
        return true;
      } catch (e) { return false; }
    },

    async exists(id) {
      return !!sqliteDb.prepare('SELECT 1 FROM users WHERE id = ?').get(id);
    }
  };

  // SQLite Game operations
  gameDb = {
    async create(game) {
      sqliteDb.prepare(`
        INSERT INTO games (id, code, host_id, host_name, status, settings, it_player_id, started_at, ended_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(game.id, game.code, game.host, game.hostName, game.status, JSON.stringify(game.settings), game.itPlayerId, game.startedAt, game.endedAt, game.createdAt);
      await this.addPlayer(game.id, game.players[0]);
      return game;
    },

    async getById(id) {
      const game = sqliteDb.prepare('SELECT * FROM games WHERE id = ?').get(id);
      if (!game) return null;
      return this._hydrateGame(game);
    },

    async getByCode(code) {
      const game = sqliteDb.prepare('SELECT * FROM games WHERE code = ?').get(code.toUpperCase());
      if (!game) return null;
      return this._hydrateGame(game);
    },

    async getActiveGameForPlayer(userId) {
      const player = sqliteDb.prepare(`
        SELECT gp.game_id FROM game_players gp JOIN games g ON gp.game_id = g.id
        WHERE gp.user_id = ? AND g.status IN ('waiting', 'active')
      `).get(userId);
      if (!player) return null;
      return this.getById(player.game_id);
    },

    async _hydrateGame(row) {
      const players = sqliteDb.prepare('SELECT * FROM game_players WHERE game_id = ?').all(row.id).map(p => ({
        id: p.user_id, name: p.name, avatar: p.avatar, location: null,
        isIt: !!p.is_it, joinedAt: p.joined_at, lastUpdate: null,
        tagCount: p.tag_count, survivalTime: p.survival_time,
        becameItAt: p.became_it_at, finalSurvivalTime: p.final_survival_time,
      }));

      const tags = sqliteDb.prepare('SELECT * FROM game_tags WHERE game_id = ?').all(row.id).map(t => ({
        id: t.id, taggerId: t.tagger_id, taggedId: t.tagged_id, timestamp: t.timestamp,
        tagTime: t.tag_time, location: t.location_lat ? { lat: t.location_lat, lng: t.location_lng } : null,
      }));

      return {
        id: row.id, code: row.code, host: row.host_id, hostName: row.host_name,
        status: row.status, settings: JSON.parse(row.settings), players,
        itPlayerId: row.it_player_id, startedAt: row.started_at, endedAt: row.ended_at,
        winnerId: row.winner_id, winnerName: row.winner_name, gameDuration: row.game_duration,
        tags, createdAt: row.created_at,
      };
    },

    async addPlayer(gameId, player) {
      sqliteDb.prepare(`
        INSERT INTO game_players (game_id, user_id, name, avatar, is_it, joined_at, tag_count, survival_time, became_it_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(gameId, player.id, player.name, player.avatar, player.isIt ? 1 : 0, player.joinedAt, player.tagCount || 0, player.survivalTime || 0, player.becameItAt);
    },

    async removePlayer(gameId, userId) {
      sqliteDb.prepare('DELETE FROM game_players WHERE game_id = ? AND user_id = ?').run(gameId, userId);
    },

    async updateGame(game) {
      sqliteDb.prepare(`
        UPDATE games SET host_id = ?, host_name = ?, status = ?, settings = ?,
          it_player_id = ?, started_at = ?, ended_at = ?, winner_id = ?, winner_name = ?, game_duration = ?
        WHERE id = ?
      `).run(game.host, game.hostName, game.status, JSON.stringify(game.settings), game.itPlayerId, game.startedAt, game.endedAt, game.winnerId || null, game.winnerName || null, game.gameDuration || null, game.id);
    },

    async updatePlayer(gameId, player) {
      sqliteDb.prepare(`
        UPDATE game_players SET is_it = ?, tag_count = ?, survival_time = ?, became_it_at = ?, final_survival_time = ?
        WHERE game_id = ? AND user_id = ?
      `).run(player.isIt ? 1 : 0, player.tagCount || 0, player.survivalTime || 0, player.becameItAt, player.finalSurvivalTime || 0, gameId, player.id);
    },

    async addTag(gameId, tag) {
      sqliteDb.prepare(`
        INSERT INTO game_tags (id, game_id, tagger_id, tagged_id, timestamp, tag_time, location_lat, location_lng)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(tag.id, gameId, tag.taggerId, tag.taggedId, tag.timestamp, tag.tagTime, tag.location?.lat, tag.location?.lng);
    },

    async deleteGame(id) {
      sqliteDb.prepare('DELETE FROM games WHERE id = ?').run(id);
    },

    async getPlayerHistory(userId, limit = 20) {
      const games = sqliteDb.prepare(`
        SELECT g.* FROM games g JOIN game_players gp ON g.id = gp.game_id
        WHERE gp.user_id = ? AND g.status = 'ended' ORDER BY g.ended_at DESC LIMIT ?
      `).all(userId, limit);
      return Promise.all(games.map(g => this._hydrateGame(g)));
    },

    async cleanupOldGames(maxAgeMs = 7 * 24 * 60 * 60 * 1000) {
      const cutoff = Date.now() - maxAgeMs;
      sqliteDb.prepare('DELETE FROM games WHERE status = ? AND ended_at < ?').run('ended', cutoff);
    }
  };

  console.log('Using SQLite database');
}

// Helper functions for social.js and replays.js
const getDb = () => db;
const isPostgres = () => !!process.env.DATABASE_URL;

export { db, userDb, gameDb, getDb, isPostgres };
