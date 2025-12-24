import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '..', 'data', 'tag.db');

// Ensure data directory exists
import fs from 'fs';
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize schema
const initSchema = () => {
  db.exec(`
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      avatar TEXT DEFAULT '😀',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    -- User stats table
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

    -- User achievements table
    CREATE TABLE IF NOT EXISTS user_achievements (
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      achievement_id TEXT NOT NULL,
      earned_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, achievement_id)
    );

    -- Games table
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

    -- Game players table
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

    -- Game tags history (privacy: stores distance instead of exact coordinates)
    CREATE TABLE IF NOT EXISTS game_tags (
      id TEXT PRIMARY KEY,
      game_id TEXT REFERENCES games(id) ON DELETE CASCADE,
      tagger_id TEXT NOT NULL,
      tagged_id TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      tag_time INTEGER,
      distance INTEGER
    );

    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_games_code ON games(code);
    CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
    CREATE INDEX IF NOT EXISTS idx_games_host ON games(host_id);
    CREATE INDEX IF NOT EXISTS idx_games_created_at ON games(created_at);
    CREATE INDEX IF NOT EXISTS idx_games_ended_at ON games(ended_at);
    CREATE INDEX IF NOT EXISTS idx_game_players_user ON game_players(user_id);
    CREATE INDEX IF NOT EXISTS idx_game_players_game ON game_players(game_id);
    CREATE INDEX IF NOT EXISTS idx_game_tags_game ON game_tags(game_id);
    CREATE INDEX IF NOT EXISTS idx_game_tags_tagger ON game_tags(tagger_id);
    CREATE INDEX IF NOT EXISTS idx_game_tags_tagged ON game_tags(tagged_id);
    CREATE INDEX IF NOT EXISTS idx_game_tags_timestamp ON game_tags(timestamp);
    CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);
  `);
};

initSchema();

// User operations
export const userDb = {
  create(user) {
    const stmt = db.prepare(`
      INSERT INTO users (id, name, avatar, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    const statsStmt = db.prepare(`
      INSERT INTO user_stats (user_id) VALUES (?)
    `);

    const now = Date.now();
    const transaction = db.transaction(() => {
      stmt.run(user.id, user.name, user.avatar, now, now);
      statsStmt.run(user.id);
    });
    transaction();

    return this.getById(user.id);
  },

  getById(id) {
    const user = db.prepare(`
      SELECT u.*,
             s.games_played, s.games_won, s.total_tags, s.times_tagged,
             s.longest_survival, s.total_play_time, s.unique_friends_played,
             s.fastest_tag, s.played_at_night
      FROM users u
      LEFT JOIN user_stats s ON u.id = s.user_id
      WHERE u.id = ?
    `).get(id);

    if (!user) return null;

    const achievements = db.prepare(`
      SELECT achievement_id FROM user_achievements WHERE user_id = ?
    `).all(id).map(a => a.achievement_id);

    return {
      id: user.id,
      name: user.name,
      avatar: user.avatar,
      createdAt: user.created_at,
      stats: {
        gamesPlayed: user.games_played,
        gamesWon: user.games_won,
        totalTags: user.total_tags,
        timesTagged: user.times_tagged,
        longestSurvival: user.longest_survival,
        totalPlayTime: user.total_play_time,
        uniqueFriendsPlayed: user.unique_friends_played,
        fastestTag: user.fastest_tag,
        playedAtNight: !!user.played_at_night,
      },
      achievements,
    };
  },

  update(id, updates) {
    const stmt = db.prepare(`
      UPDATE users SET name = ?, avatar = ?, updated_at = ?
      WHERE id = ?
    `);
    stmt.run(updates.name, updates.avatar, Date.now(), id);
    return this.getById(id);
  },

  updateStats(id, stats) {
    const existing = db.prepare('SELECT * FROM user_stats WHERE user_id = ?').get(id);
    if (!existing) return;

    const updates = [];
    const values = [];

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
    db.prepare(`UPDATE user_stats SET ${updates.join(', ')} WHERE user_id = ?`).run(...values);
  },

  addAchievement(id, achievementId) {
    try {
      db.prepare(`
        INSERT INTO user_achievements (user_id, achievement_id, earned_at)
        VALUES (?, ?, ?)
      `).run(id, achievementId, Date.now());
      return true;
    } catch (e) {
      // Already has achievement
      return false;
    }
  },

  exists(id) {
    const row = db.prepare('SELECT 1 FROM users WHERE id = ?').get(id);
    return !!row;
  }
};

// Game operations
export const gameDb = {
  create(game) {
    const stmt = db.prepare(`
      INSERT INTO games (id, code, host_id, host_name, status, settings, it_player_id, started_at, ended_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      game.id,
      game.code,
      game.host,
      game.hostName,
      game.status,
      JSON.stringify(game.settings),
      game.itPlayerId,
      game.startedAt,
      game.endedAt,
      game.createdAt
    );

    // Add host as first player
    this.addPlayer(game.id, game.players[0]);

    return game;
  },

  getById(id) {
    const game = db.prepare('SELECT * FROM games WHERE id = ?').get(id);
    if (!game) return null;
    return this._hydrateGame(game);
  },

  getByCode(code) {
    const game = db.prepare('SELECT * FROM games WHERE code = ?').get(code.toUpperCase());
    if (!game) return null;
    return this._hydrateGame(game);
  },

  getActiveGameForPlayer(userId) {
    const player = db.prepare(`
      SELECT gp.game_id FROM game_players gp
      JOIN games g ON gp.game_id = g.id
      WHERE gp.user_id = ? AND g.status IN ('waiting', 'active')
    `).get(userId);

    if (!player) return null;
    return this.getById(player.game_id);
  },

  _hydrateGame(row) {
    const players = db.prepare(`
      SELECT * FROM game_players WHERE game_id = ?
    `).all(row.id).map(p => ({
      id: p.user_id,
      name: p.name,
      avatar: p.avatar,
      location: null, // Location is transient, not persisted
      isIt: !!p.is_it,
      joinedAt: p.joined_at,
      lastUpdate: null,
      tagCount: p.tag_count,
      survivalTime: p.survival_time,
      becameItAt: p.became_it_at,
      finalSurvivalTime: p.final_survival_time,
    }));

    const tags = db.prepare(`
      SELECT * FROM game_tags WHERE game_id = ?
    `).all(row.id).map(t => ({
      id: t.id,
      taggerId: t.tagger_id,
      taggedId: t.tagged_id,
      timestamp: t.timestamp,
      tagTime: t.tag_time,
      distance: t.distance,
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
      startedAt: row.started_at,
      endedAt: row.ended_at,
      winnerId: row.winner_id,
      winnerName: row.winner_name,
      gameDuration: row.game_duration,
      tags,
      createdAt: row.created_at,
    };
  },

  addPlayer(gameId, player) {
    db.prepare(`
      INSERT INTO game_players (game_id, user_id, name, avatar, is_it, joined_at, tag_count, survival_time, became_it_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      gameId,
      player.id,
      player.name,
      player.avatar,
      player.isIt ? 1 : 0,
      player.joinedAt,
      player.tagCount || 0,
      player.survivalTime || 0,
      player.becameItAt
    );
  },

  removePlayer(gameId, userId) {
    db.prepare('DELETE FROM game_players WHERE game_id = ? AND user_id = ?').run(gameId, userId);
  },

  updateGame(game) {
    db.prepare(`
      UPDATE games SET
        host_id = ?, host_name = ?, status = ?, settings = ?,
        it_player_id = ?, started_at = ?, ended_at = ?,
        winner_id = ?, winner_name = ?, game_duration = ?
      WHERE id = ?
    `).run(
      game.host,
      game.hostName,
      game.status,
      JSON.stringify(game.settings),
      game.itPlayerId,
      game.startedAt,
      game.endedAt,
      game.winnerId || null,
      game.winnerName || null,
      game.gameDuration || null,
      game.id
    );
  },

  updatePlayer(gameId, player) {
    db.prepare(`
      UPDATE game_players SET
        is_it = ?, tag_count = ?, survival_time = ?, became_it_at = ?, final_survival_time = ?
      WHERE game_id = ? AND user_id = ?
    `).run(
      player.isIt ? 1 : 0,
      player.tagCount || 0,
      player.survivalTime || 0,
      player.becameItAt,
      player.finalSurvivalTime || 0,
      gameId,
      player.id
    );
  },

  addTag(gameId, tag) {
    db.prepare(`
      INSERT INTO game_tags (id, game_id, tagger_id, tagged_id, timestamp, tag_time, distance)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      tag.id,
      gameId,
      tag.taggerId,
      tag.taggedId,
      tag.timestamp,
      tag.tagTime,
      tag.distance
    );
  },

  deleteGame(id) {
    db.prepare('DELETE FROM games WHERE id = ?').run(id);
  },

  getPlayerHistory(userId, limit = 20) {
    const games = db.prepare(`
      SELECT g.* FROM games g
      JOIN game_players gp ON g.id = gp.game_id
      WHERE gp.user_id = ? AND g.status = 'ended'
      ORDER BY g.ended_at DESC
      LIMIT ?
    `).all(userId, limit);

    return games.map(g => this._hydrateGame(g));
  },

  cleanupOldGames(maxAgeMs = 7 * 24 * 60 * 60 * 1000) {
    const cutoff = Date.now() - maxAgeMs;
    db.prepare('DELETE FROM games WHERE status = ? AND ended_at < ?').run('ended', cutoff);
  }
};

export { db };
