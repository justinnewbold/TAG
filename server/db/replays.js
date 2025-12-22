// Game Replays Database Module
// Stores game events for replay functionality

import { getDb, isPostgres } from './index.js';

class ReplayDb {
  constructor() {
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;
    
    const db = getDb();
    
    if (isPostgres()) {
      await db.query(`
        CREATE TABLE IF NOT EXISTS game_replays (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          game_id UUID NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          duration_ms INTEGER,
          game_mode VARCHAR(50),
          player_count INTEGER,
          winner_id UUID,
          metadata JSONB DEFAULT '{}'
        );
        
        CREATE TABLE IF NOT EXISTS replay_events (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          replay_id UUID NOT NULL REFERENCES game_replays(id) ON DELETE CASCADE,
          timestamp_ms INTEGER NOT NULL,
          event_type VARCHAR(50) NOT NULL,
          player_id UUID,
          data JSONB DEFAULT '{}',
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_replay_events_replay_id ON replay_events(replay_id);
        CREATE INDEX IF NOT EXISTS idx_replay_events_timestamp ON replay_events(timestamp_ms);
        CREATE INDEX IF NOT EXISTS idx_game_replays_game_id ON game_replays(game_id);
      `);
    } else {
      // SQLite
      db.exec(`
        CREATE TABLE IF NOT EXISTS game_replays (
          id TEXT PRIMARY KEY,
          game_id TEXT NOT NULL,
          created_at TEXT DEFAULT (datetime('now')),
          duration_ms INTEGER,
          game_mode TEXT,
          player_count INTEGER,
          winner_id TEXT,
          metadata TEXT DEFAULT '{}'
        );
        
        CREATE TABLE IF NOT EXISTS replay_events (
          id TEXT PRIMARY KEY,
          replay_id TEXT NOT NULL,
          timestamp_ms INTEGER NOT NULL,
          event_type TEXT NOT NULL,
          player_id TEXT,
          data TEXT DEFAULT '{}',
          created_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (replay_id) REFERENCES game_replays(id) ON DELETE CASCADE
        );
        
        CREATE INDEX IF NOT EXISTS idx_replay_events_replay_id ON replay_events(replay_id);
        CREATE INDEX IF NOT EXISTS idx_replay_events_timestamp ON replay_events(timestamp_ms);
        CREATE INDEX IF NOT EXISTS idx_game_replays_game_id ON game_replays(game_id);
      `);
    }
    
    this.initialized = true;
    console.log('Replay tables initialized');
  }

  async createReplay(gameId, gameMode, playerCount, metadata = {}) {
    const db = getDb();
    const id = crypto.randomUUID();
    
    if (isPostgres()) {
      await db.query(
        `INSERT INTO game_replays (id, game_id, game_mode, player_count, metadata) 
         VALUES ($1, $2, $3, $4, $5)`,
        [id, gameId, gameMode, playerCount, JSON.stringify(metadata)]
      );
    } else {
      db.prepare(
        `INSERT INTO game_replays (id, game_id, game_mode, player_count, metadata) 
         VALUES (?, ?, ?, ?, ?)`
      ).run(id, gameId, gameMode, playerCount, JSON.stringify(metadata));
    }
    
    return id;
  }

  async addEvent(replayId, timestampMs, eventType, playerId, data = {}) {
    const db = getDb();
    const id = crypto.randomUUID();
    
    if (isPostgres()) {
      await db.query(
        `INSERT INTO replay_events (id, replay_id, timestamp_ms, event_type, player_id, data) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, replayId, timestampMs, eventType, playerId, JSON.stringify(data)]
      );
    } else {
      db.prepare(
        `INSERT INTO replay_events (id, replay_id, timestamp_ms, event_type, player_id, data) 
         VALUES (?, ?, ?, ?, ?, ?)`
      ).run(id, replayId, timestampMs, eventType, playerId, JSON.stringify(data));
    }
    
    return id;
  }

  async addEventsBatch(replayId, events) {
    const db = getDb();
    
    if (isPostgres()) {
      // Use a transaction for batch insert
      const client = await db.connect();
      try {
        await client.query('BEGIN');
        for (const event of events) {
          const id = crypto.randomUUID();
          await client.query(
            `INSERT INTO replay_events (id, replay_id, timestamp_ms, event_type, player_id, data) 
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [id, replayId, event.timestampMs, event.eventType, event.playerId, JSON.stringify(event.data || {})]
          );
        }
        await client.query('COMMIT');
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    } else {
      const stmt = db.prepare(
        `INSERT INTO replay_events (id, replay_id, timestamp_ms, event_type, player_id, data) 
         VALUES (?, ?, ?, ?, ?, ?)`
      );
      const insertMany = db.transaction((events) => {
        for (const event of events) {
          const id = crypto.randomUUID();
          stmt.run(id, replayId, event.timestampMs, event.eventType, event.playerId, JSON.stringify(event.data || {}));
        }
      });
      insertMany(events);
    }
  }

  async finalizeReplay(replayId, durationMs, winnerId) {
    const db = getDb();
    
    if (isPostgres()) {
      await db.query(
        `UPDATE game_replays SET duration_ms = $1, winner_id = $2 WHERE id = $3`,
        [durationMs, winnerId, replayId]
      );
    } else {
      db.prepare(
        `UPDATE game_replays SET duration_ms = ?, winner_id = ? WHERE id = ?`
      ).run(durationMs, winnerId, replayId);
    }
  }

  async getReplay(replayId) {
    const db = getDb();
    let replay;
    
    if (isPostgres()) {
      const result = await db.query('SELECT * FROM game_replays WHERE id = $1', [replayId]);
      replay = result.rows[0];
    } else {
      replay = db.prepare('SELECT * FROM game_replays WHERE id = ?').get(replayId);
    }
    
    if (!replay) return null;
    
    replay.metadata = typeof replay.metadata === 'string' ? JSON.parse(replay.metadata) : replay.metadata;
    return replay;
  }

  async getReplayEvents(replayId) {
    const db = getDb();
    let events;
    
    if (isPostgres()) {
      const result = await db.query(
        'SELECT * FROM replay_events WHERE replay_id = $1 ORDER BY timestamp_ms ASC',
        [replayId]
      );
      events = result.rows;
    } else {
      events = db.prepare(
        'SELECT * FROM replay_events WHERE replay_id = ? ORDER BY timestamp_ms ASC'
      ).all(replayId);
    }
    
    return events.map(e => ({
      ...e,
      data: typeof e.data === 'string' ? JSON.parse(e.data) : e.data
    }));
  }

  async getReplaysByGame(gameId) {
    const db = getDb();
    let replays;
    
    if (isPostgres()) {
      const result = await db.query(
        'SELECT * FROM game_replays WHERE game_id = $1 ORDER BY created_at DESC',
        [gameId]
      );
      replays = result.rows;
    } else {
      replays = db.prepare(
        'SELECT * FROM game_replays WHERE game_id = ? ORDER BY created_at DESC'
      ).all(gameId);
    }
    
    return replays.map(r => ({
      ...r,
      metadata: typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata
    }));
  }

  async getReplaysByPlayer(playerId, limit = 20) {
    const db = getDb();
    let replays;
    
    if (isPostgres()) {
      const result = await db.query(
        `SELECT DISTINCT gr.* FROM game_replays gr
         JOIN replay_events re ON gr.id = re.replay_id
         WHERE re.player_id = $1
         ORDER BY gr.created_at DESC
         LIMIT $2`,
        [playerId, limit]
      );
      replays = result.rows;
    } else {
      replays = db.prepare(
        `SELECT DISTINCT gr.* FROM game_replays gr
         JOIN replay_events re ON gr.id = re.replay_id
         WHERE re.player_id = ?
         ORDER BY gr.created_at DESC
         LIMIT ?`
      ).all(playerId, limit);
    }
    
    return replays.map(r => ({
      ...r,
      metadata: typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata
    }));
  }

  async deleteOldReplays(daysOld = 30) {
    const db = getDb();
    const cutoff = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
    
    if (isPostgres()) {
      await db.query('DELETE FROM game_replays WHERE created_at < $1', [cutoff]);
    } else {
      db.prepare('DELETE FROM game_replays WHERE created_at < ?').run(cutoff.toISOString());
    }
  }
}

export const replayDb = new ReplayDb();
