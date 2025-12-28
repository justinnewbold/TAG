// Leaderboards, XP/Levels, Clans, Tournaments Database Module

import { getDb, isPostgres } from './index.js';

class SocialDb {
  constructor() {
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;
    
    const db = getDb();
    
    if (isPostgres()) {
      await db.query(`
        -- Global Leaderboards (cached/materialized)
        CREATE TABLE IF NOT EXISTS leaderboard_entries (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL UNIQUE,
          total_wins INTEGER DEFAULT 0,
          total_tags INTEGER DEFAULT 0,
          total_games INTEGER DEFAULT 0,
          total_survival_time INTEGER DEFAULT 0,
          win_streak INTEGER DEFAULT 0,
          best_win_streak INTEGER DEFAULT 0,
          xp INTEGER DEFAULT 0,
          level INTEGER DEFAULT 1,
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        -- XP Transactions Log
        CREATE TABLE IF NOT EXISTS xp_transactions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL,
          amount INTEGER NOT NULL,
          reason VARCHAR(100),
          game_id UUID,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        -- Clans/Teams
        CREATE TABLE IF NOT EXISTS clans (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(50) NOT NULL UNIQUE,
          tag VARCHAR(10) NOT NULL UNIQUE,
          description TEXT,
          avatar TEXT,
          owner_id UUID NOT NULL,
          total_wins INTEGER DEFAULT 0,
          total_games INTEGER DEFAULT 0,
          member_count INTEGER DEFAULT 1,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        CREATE TABLE IF NOT EXISTS clan_members (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          clan_id UUID NOT NULL REFERENCES clans(id) ON DELETE CASCADE,
          user_id UUID NOT NULL,
          role VARCHAR(20) DEFAULT 'member',
          joined_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(clan_id, user_id)
        );
        
        CREATE TABLE IF NOT EXISTS clan_invites (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          clan_id UUID NOT NULL REFERENCES clans(id) ON DELETE CASCADE,
          user_id UUID NOT NULL,
          invited_by UUID NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
          UNIQUE(clan_id, user_id)
        );
        
        -- Tournaments
        CREATE TABLE IF NOT EXISTS tournaments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(100) NOT NULL,
          description TEXT,
          game_mode VARCHAR(50) DEFAULT 'classic',
          status VARCHAR(20) DEFAULT 'upcoming',
          max_participants INTEGER DEFAULT 32,
          entry_type VARCHAR(20) DEFAULT 'solo',
          start_time TIMESTAMPTZ NOT NULL,
          end_time TIMESTAMPTZ,
          prize_description TEXT,
          rules JSONB DEFAULT '{}',
          created_by UUID NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        CREATE TABLE IF NOT EXISTS tournament_participants (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
          user_id UUID,
          clan_id UUID,
          seed INTEGER,
          eliminated BOOLEAN DEFAULT FALSE,
          final_rank INTEGER,
          registered_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(tournament_id, user_id)
        );
        
        CREATE TABLE IF NOT EXISTS tournament_matches (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
          round INTEGER NOT NULL,
          match_number INTEGER NOT NULL,
          game_id UUID,
          participant1_id UUID,
          participant2_id UUID,
          winner_id UUID,
          status VARCHAR(20) DEFAULT 'pending',
          scheduled_time TIMESTAMPTZ,
          completed_at TIMESTAMPTZ
        );
        
        -- Seasons
        CREATE TABLE IF NOT EXISTS seasons (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(100) NOT NULL,
          number INTEGER NOT NULL UNIQUE,
          start_date TIMESTAMPTZ NOT NULL,
          end_date TIMESTAMPTZ NOT NULL,
          rewards JSONB DEFAULT '{}',
          is_active BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        CREATE TABLE IF NOT EXISTS season_rankings (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
          user_id UUID NOT NULL,
          rank INTEGER,
          points INTEGER DEFAULT 0,
          wins INTEGER DEFAULT 0,
          games INTEGER DEFAULT 0,
          UNIQUE(season_id, user_id)
        );
        
        -- Player Reports
        CREATE TABLE IF NOT EXISTS player_reports (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          reporter_id UUID NOT NULL,
          reported_id UUID NOT NULL,
          game_id UUID,
          reason VARCHAR(50) NOT NULL,
          description TEXT,
          evidence JSONB DEFAULT '[]',
          status VARCHAR(20) DEFAULT 'pending',
          reviewed_by UUID,
          reviewed_at TIMESTAMPTZ,
          action_taken VARCHAR(50),
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        -- Chat Messages (persistent)
        CREATE TABLE IF NOT EXISTS chat_messages (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          game_id UUID NOT NULL,
          user_id UUID NOT NULL,
          message TEXT NOT NULL,
          message_type VARCHAR(20) DEFAULT 'text',
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        -- Push Subscriptions (persistent)
        CREATE TABLE IF NOT EXISTS push_subscriptions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL,
          endpoint TEXT NOT NULL UNIQUE,
          p256dh TEXT NOT NULL,
          auth TEXT NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          last_used TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_leaderboard_wins ON leaderboard_entries(total_wins DESC);
        CREATE INDEX IF NOT EXISTS idx_leaderboard_tags ON leaderboard_entries(total_tags DESC);
        CREATE INDEX IF NOT EXISTS idx_leaderboard_xp ON leaderboard_entries(xp DESC);
        CREATE INDEX IF NOT EXISTS idx_leaderboard_level ON leaderboard_entries(level DESC);
        CREATE INDEX IF NOT EXISTS idx_chat_game ON chat_messages(game_id, created_at);
        CREATE INDEX IF NOT EXISTS idx_reports_status ON player_reports(status);
        CREATE INDEX IF NOT EXISTS idx_push_user ON push_subscriptions(user_id);
      `);
    } else {
      // SQLite version
      db.exec(`
        CREATE TABLE IF NOT EXISTS leaderboard_entries (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL UNIQUE,
          total_wins INTEGER DEFAULT 0,
          total_tags INTEGER DEFAULT 0,
          total_games INTEGER DEFAULT 0,
          total_survival_time INTEGER DEFAULT 0,
          win_streak INTEGER DEFAULT 0,
          best_win_streak INTEGER DEFAULT 0,
          xp INTEGER DEFAULT 0,
          level INTEGER DEFAULT 1,
          updated_at TEXT DEFAULT (datetime('now'))
        );
        
        CREATE TABLE IF NOT EXISTS xp_transactions (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          amount INTEGER NOT NULL,
          reason TEXT,
          game_id TEXT,
          created_at TEXT DEFAULT (datetime('now'))
        );
        
        CREATE TABLE IF NOT EXISTS clans (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          tag TEXT NOT NULL UNIQUE,
          description TEXT,
          avatar TEXT,
          owner_id TEXT NOT NULL,
          total_wins INTEGER DEFAULT 0,
          total_games INTEGER DEFAULT 0,
          member_count INTEGER DEFAULT 1,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now'))
        );
        
        CREATE TABLE IF NOT EXISTS clan_members (
          id TEXT PRIMARY KEY,
          clan_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          role TEXT DEFAULT 'member',
          joined_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (clan_id) REFERENCES clans(id) ON DELETE CASCADE,
          UNIQUE(clan_id, user_id)
        );
        
        CREATE TABLE IF NOT EXISTS clan_invites (
          id TEXT PRIMARY KEY,
          clan_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          invited_by TEXT NOT NULL,
          created_at TEXT DEFAULT (datetime('now')),
          expires_at TEXT,
          FOREIGN KEY (clan_id) REFERENCES clans(id) ON DELETE CASCADE,
          UNIQUE(clan_id, user_id)
        );
        
        CREATE TABLE IF NOT EXISTS tournaments (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          game_mode TEXT DEFAULT 'classic',
          status TEXT DEFAULT 'upcoming',
          max_participants INTEGER DEFAULT 32,
          entry_type TEXT DEFAULT 'solo',
          start_time TEXT NOT NULL,
          end_time TEXT,
          prize_description TEXT,
          rules TEXT DEFAULT '{}',
          created_by TEXT NOT NULL,
          created_at TEXT DEFAULT (datetime('now'))
        );
        
        CREATE TABLE IF NOT EXISTS tournament_participants (
          id TEXT PRIMARY KEY,
          tournament_id TEXT NOT NULL,
          user_id TEXT,
          clan_id TEXT,
          seed INTEGER,
          eliminated INTEGER DEFAULT 0,
          final_rank INTEGER,
          registered_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
          UNIQUE(tournament_id, user_id)
        );
        
        CREATE TABLE IF NOT EXISTS tournament_matches (
          id TEXT PRIMARY KEY,
          tournament_id TEXT NOT NULL,
          round INTEGER NOT NULL,
          match_number INTEGER NOT NULL,
          game_id TEXT,
          participant1_id TEXT,
          participant2_id TEXT,
          winner_id TEXT,
          status TEXT DEFAULT 'pending',
          scheduled_time TEXT,
          completed_at TEXT,
          FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
        );
        
        CREATE TABLE IF NOT EXISTS seasons (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          number INTEGER NOT NULL UNIQUE,
          start_date TEXT NOT NULL,
          end_date TEXT NOT NULL,
          rewards TEXT DEFAULT '{}',
          is_active INTEGER DEFAULT 0,
          created_at TEXT DEFAULT (datetime('now'))
        );
        
        CREATE TABLE IF NOT EXISTS season_rankings (
          id TEXT PRIMARY KEY,
          season_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          rank INTEGER,
          points INTEGER DEFAULT 0,
          wins INTEGER DEFAULT 0,
          games INTEGER DEFAULT 0,
          FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE CASCADE,
          UNIQUE(season_id, user_id)
        );
        
        CREATE TABLE IF NOT EXISTS player_reports (
          id TEXT PRIMARY KEY,
          reporter_id TEXT NOT NULL,
          reported_id TEXT NOT NULL,
          game_id TEXT,
          reason TEXT NOT NULL,
          description TEXT,
          evidence TEXT DEFAULT '[]',
          status TEXT DEFAULT 'pending',
          reviewed_by TEXT,
          reviewed_at TEXT,
          action_taken TEXT,
          created_at TEXT DEFAULT (datetime('now'))
        );
        
        CREATE TABLE IF NOT EXISTS chat_messages (
          id TEXT PRIMARY KEY,
          game_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          message TEXT NOT NULL,
          message_type TEXT DEFAULT 'text',
          created_at TEXT DEFAULT (datetime('now'))
        );
        
        CREATE TABLE IF NOT EXISTS push_subscriptions (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          endpoint TEXT NOT NULL UNIQUE,
          p256dh TEXT NOT NULL,
          auth TEXT NOT NULL,
          created_at TEXT DEFAULT (datetime('now')),
          last_used TEXT DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_leaderboard_wins ON leaderboard_entries(total_wins DESC);
        CREATE INDEX IF NOT EXISTS idx_leaderboard_tags ON leaderboard_entries(total_tags DESC);
        CREATE INDEX IF NOT EXISTS idx_leaderboard_xp ON leaderboard_entries(xp DESC);
        CREATE INDEX IF NOT EXISTS idx_chat_game ON chat_messages(game_id, created_at);
        CREATE INDEX IF NOT EXISTS idx_reports_status ON player_reports(status);
        CREATE INDEX IF NOT EXISTS idx_push_user ON push_subscriptions(user_id);
      `);
    }
    
    this.initialized = true;
    console.log('Social/competitive tables initialized');
  }

  // ============ LEADERBOARD METHODS ============
  
  async getOrCreateLeaderboardEntry(userId) {
    const db = getDb();
    let entry;
    
    if (isPostgres()) {
      const result = await db.query('SELECT * FROM leaderboard_entries WHERE user_id = $1', [userId]);
      entry = result.rows[0];
      
      if (!entry) {
        const id = crypto.randomUUID();
        await db.query('INSERT INTO leaderboard_entries (id, user_id) VALUES ($1, $2)', [id, userId]);
        entry = { id, user_id: userId, total_wins: 0, total_tags: 0, total_games: 0, xp: 0, level: 1 };
      }
    } else {
      entry = db.prepare('SELECT * FROM leaderboard_entries WHERE user_id = ?').get(userId);
      
      if (!entry) {
        const id = crypto.randomUUID();
        db.prepare('INSERT INTO leaderboard_entries (id, user_id) VALUES (?, ?)').run(id, userId);
        entry = { id, user_id: userId, total_wins: 0, total_tags: 0, total_games: 0, xp: 0, level: 1 };
      }
    }
    
    return entry;
  }

  async updateLeaderboardStats(userId, stats) {
    const db = getDb();
    const now = new Date().toISOString();
    
    // Ensure entry exists
    await this.getOrCreateLeaderboardEntry(userId);
    
    if (isPostgres()) {
      await db.query(`
        UPDATE leaderboard_entries SET
          total_wins = total_wins + $1,
          total_tags = total_tags + $2,
          total_games = total_games + $3,
          total_survival_time = total_survival_time + $4,
          win_streak = $5,
          best_win_streak = GREATEST(best_win_streak, $5),
          updated_at = $6
        WHERE user_id = $7
      `, [
        stats.wins || 0,
        stats.tags || 0,
        stats.games || 0,
        stats.survivalTime || 0,
        stats.winStreak || 0,
        now,
        userId
      ]);
    } else {
      db.prepare(`
        UPDATE leaderboard_entries SET
          total_wins = total_wins + ?,
          total_tags = total_tags + ?,
          total_games = total_games + ?,
          total_survival_time = total_survival_time + ?,
          win_streak = ?,
          best_win_streak = MAX(best_win_streak, ?),
          updated_at = ?
        WHERE user_id = ?
      `).run(
        stats.wins || 0,
        stats.tags || 0,
        stats.games || 0,
        stats.survivalTime || 0,
        stats.winStreak || 0,
        stats.winStreak || 0,
        now,
        userId
      );
    }
  }

  async getLeaderboard(type = 'wins', limit = 100, offset = 0) {
    const db = getDb();
    const orderColumn = {
      wins: 'total_wins',
      tags: 'total_tags',
      games: 'total_games',
      survival: 'total_survival_time',
      xp: 'xp',
      level: 'level',
      streak: 'best_win_streak'
    }[type] || 'total_wins';
    
    if (isPostgres()) {
      const result = await db.query(`
        SELECT le.*, u.name, u.avatar 
        FROM leaderboard_entries le
        JOIN users u ON le.user_id = u.id
        ORDER BY ${orderColumn} DESC
        LIMIT $1 OFFSET $2
      `, [limit, offset]);
      return result.rows;
    } else {
      return db.prepare(`
        SELECT le.*, u.name, u.avatar 
        FROM leaderboard_entries le
        JOIN users u ON le.user_id = u.id
        ORDER BY ${orderColumn} DESC
        LIMIT ? OFFSET ?
      `).all(limit, offset);
    }
  }

  async getUserRank(userId, type = 'wins') {
    const db = getDb();
    const orderColumn = {
      wins: 'total_wins',
      tags: 'total_tags',
      xp: 'xp',
      level: 'level'
    }[type] || 'total_wins';
    
    if (isPostgres()) {
      const result = await db.query(`
        SELECT rank FROM (
          SELECT user_id, ROW_NUMBER() OVER (ORDER BY ${orderColumn} DESC) as rank
          FROM leaderboard_entries
        ) ranked WHERE user_id = $1
      `, [userId]);
      return result.rows[0]?.rank || null;
    } else {
      const result = db.prepare(`
        SELECT COUNT(*) + 1 as rank FROM leaderboard_entries
        WHERE ${orderColumn} > (SELECT ${orderColumn} FROM leaderboard_entries WHERE user_id = ?)
      `).get(userId);
      return result?.rank || null;
    }
  }

  // ============ XP/LEVEL METHODS ============
  
  async addXp(userId, amount, reason, gameId = null) {
    const db = getDb();
    const id = crypto.randomUUID();
    
    // Log transaction
    if (isPostgres()) {
      await db.query(
        'INSERT INTO xp_transactions (id, user_id, amount, reason, game_id) VALUES ($1, $2, $3, $4, $5)',
        [id, userId, amount, reason, gameId]
      );
    } else {
      db.prepare(
        'INSERT INTO xp_transactions (id, user_id, amount, reason, game_id) VALUES (?, ?, ?, ?, ?)'
      ).run(id, userId, amount, reason, gameId);
    }
    
    // Update leaderboard entry
    await this.getOrCreateLeaderboardEntry(userId);
    
    if (isPostgres()) {
      await db.query('UPDATE leaderboard_entries SET xp = xp + $1 WHERE user_id = $2', [amount, userId]);
    } else {
      db.prepare('UPDATE leaderboard_entries SET xp = xp + ? WHERE user_id = ?').run(amount, userId);
    }
    
    // Check for level up
    return this.checkLevelUp(userId);
  }

  async checkLevelUp(userId) {
    const entry = await this.getOrCreateLeaderboardEntry(userId);
    const currentXp = entry.xp;
    const currentLevel = entry.level;
    
    // XP required for each level: level * 1000
    const xpForNextLevel = currentLevel * 1000;
    
    if (currentXp >= xpForNextLevel) {
      const newLevel = currentLevel + 1;
      const db = getDb();
      
      if (isPostgres()) {
        await db.query('UPDATE leaderboard_entries SET level = $1 WHERE user_id = $2', [newLevel, userId]);
      } else {
        db.prepare('UPDATE leaderboard_entries SET level = ? WHERE user_id = ?').run(newLevel, userId);
      }
      
      return { leveledUp: true, newLevel, xp: currentXp };
    }
    
    return { leveledUp: false, level: currentLevel, xp: currentXp, xpToNext: xpForNextLevel - currentXp };
  }

  // ============ CLAN METHODS ============
  
  async createClan(name, tag, ownerId, description = '', avatar = '⚔️') {
    const db = getDb();
    const id = crypto.randomUUID();
    const memberId = crypto.randomUUID();
    
    if (isPostgres()) {
      await db.query(
        'INSERT INTO clans (id, name, tag, description, avatar, owner_id) VALUES ($1, $2, $3, $4, $5, $6)',
        [id, name, tag.toUpperCase(), description, avatar, ownerId]
      );
      await db.query(
        'INSERT INTO clan_members (id, clan_id, user_id, role) VALUES ($1, $2, $3, $4)',
        [memberId, id, ownerId, 'owner']
      );
    } else {
      db.prepare(
        'INSERT INTO clans (id, name, tag, description, avatar, owner_id) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(id, name, tag.toUpperCase(), description, avatar, ownerId);
      db.prepare(
        'INSERT INTO clan_members (id, clan_id, user_id, role) VALUES (?, ?, ?, ?)'
      ).run(memberId, id, ownerId, 'owner');
    }
    
    return { id, name, tag: tag.toUpperCase(), owner_id: ownerId };
  }

  async getClan(clanId) {
    const db = getDb();
    
    if (isPostgres()) {
      const result = await db.query('SELECT * FROM clans WHERE id = $1', [clanId]);
      return result.rows[0];
    } else {
      return db.prepare('SELECT * FROM clans WHERE id = ?').get(clanId);
    }
  }

  async getClanMembers(clanId) {
    const db = getDb();
    
    if (isPostgres()) {
      const result = await db.query(`
        SELECT cm.*, u.name, u.avatar, le.level, le.xp
        FROM clan_members cm
        JOIN users u ON cm.user_id = u.id
        LEFT JOIN leaderboard_entries le ON cm.user_id = le.user_id
        WHERE cm.clan_id = $1
        ORDER BY cm.role = 'owner' DESC, cm.joined_at ASC
      `, [clanId]);
      return result.rows;
    } else {
      return db.prepare(`
        SELECT cm.*, u.name, u.avatar, le.level, le.xp
        FROM clan_members cm
        JOIN users u ON cm.user_id = u.id
        LEFT JOIN leaderboard_entries le ON cm.user_id = le.user_id
        WHERE cm.clan_id = ?
        ORDER BY cm.role = 'owner' DESC, cm.joined_at ASC
      `).all(clanId);
    }
  }

  async getUserClan(userId) {
    const db = getDb();
    
    if (isPostgres()) {
      const result = await db.query(`
        SELECT c.*, cm.role FROM clans c
        JOIN clan_members cm ON c.id = cm.clan_id
        WHERE cm.user_id = $1
      `, [userId]);
      return result.rows[0];
    } else {
      return db.prepare(`
        SELECT c.*, cm.role FROM clans c
        JOIN clan_members cm ON c.id = cm.clan_id
        WHERE cm.user_id = ?
      `).get(userId);
    }
  }

  async joinClan(clanId, userId) {
    const db = getDb();
    const id = crypto.randomUUID();
    
    if (isPostgres()) {
      await db.query(
        'INSERT INTO clan_members (id, clan_id, user_id) VALUES ($1, $2, $3)',
        [id, clanId, userId]
      );
      await db.query(
        'UPDATE clans SET member_count = member_count + 1 WHERE id = $1',
        [clanId]
      );
    } else {
      db.prepare('INSERT INTO clan_members (id, clan_id, user_id) VALUES (?, ?, ?)').run(id, clanId, userId);
      db.prepare('UPDATE clans SET member_count = member_count + 1 WHERE id = ?').run(clanId);
    }
  }

  async leaveClan(clanId, userId) {
    const db = getDb();
    
    if (isPostgres()) {
      await db.query('DELETE FROM clan_members WHERE clan_id = $1 AND user_id = $2', [clanId, userId]);
      await db.query('UPDATE clans SET member_count = member_count - 1 WHERE id = $1', [clanId]);
    } else {
      db.prepare('DELETE FROM clan_members WHERE clan_id = ? AND user_id = ?').run(clanId, userId);
      db.prepare('UPDATE clans SET member_count = member_count - 1 WHERE id = ?').run(clanId);
    }
  }

  // ============ TOURNAMENT METHODS ============
  
  async createTournament(data) {
    const db = getDb();
    const id = crypto.randomUUID();
    
    if (isPostgres()) {
      await db.query(`
        INSERT INTO tournaments (id, name, description, game_mode, max_participants, entry_type, start_time, prize_description, rules, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [id, data.name, data.description, data.gameMode, data.maxParticipants, data.entryType, data.startTime, data.prizeDescription, JSON.stringify(data.rules || {}), data.createdBy]);
    } else {
      db.prepare(`
        INSERT INTO tournaments (id, name, description, game_mode, max_participants, entry_type, start_time, prize_description, rules, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, data.name, data.description, data.gameMode, data.maxParticipants, data.entryType, data.startTime, data.prizeDescription, JSON.stringify(data.rules || {}), data.createdBy);
    }
    
    return { id, ...data };
  }

  async getTournament(tournamentId) {
    const db = getDb();
    let tournament;
    
    if (isPostgres()) {
      const result = await db.query('SELECT * FROM tournaments WHERE id = $1', [tournamentId]);
      tournament = result.rows[0];
    } else {
      tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(tournamentId);
    }
    
    if (tournament) {
      tournament.rules = typeof tournament.rules === 'string' ? JSON.parse(tournament.rules) : tournament.rules;
    }
    
    return tournament;
  }

  async getUpcomingTournaments(limit = 20) {
    const db = getDb();
    const now = new Date().toISOString();
    
    if (isPostgres()) {
      const result = await db.query(`
        SELECT * FROM tournaments 
        WHERE status IN ('upcoming', 'active') AND start_time > $1
        ORDER BY start_time ASC LIMIT $2
      `, [now, limit]);
      return result.rows;
    } else {
      return db.prepare(`
        SELECT * FROM tournaments 
        WHERE status IN ('upcoming', 'active') AND start_time > ?
        ORDER BY start_time ASC LIMIT ?
      `).all(now, limit);
    }
  }

  async registerForTournament(tournamentId, userId, clanId = null) {
    const db = getDb();
    const id = crypto.randomUUID();

    if (isPostgres()) {
      await db.query(
        'INSERT INTO tournament_participants (id, tournament_id, user_id, clan_id) VALUES ($1, $2, $3, $4)',
        [id, tournamentId, userId, clanId]
      );
    } else {
      db.prepare(
        'INSERT INTO tournament_participants (id, tournament_id, user_id, clan_id) VALUES (?, ?, ?, ?)'
      ).run(id, tournamentId, userId, clanId);
    }

    return id;
  }

  async updateTournamentStatus(tournamentId, status) {
    const db = getDb();

    if (isPostgres()) {
      const result = await db.query(
        'UPDATE tournaments SET status = $1 WHERE id = $2 RETURNING *',
        [status, tournamentId]
      );
      return result.rows[0];
    } else {
      db.prepare('UPDATE tournaments SET status = ? WHERE id = ?').run(status, tournamentId);
      return db.prepare('SELECT * FROM tournaments WHERE id = ?').get(tournamentId);
    }
  }

  // ============ CHAT METHODS ============
  
  async saveChatMessage(gameId, userId, message, messageType = 'text') {
    const db = getDb();
    const id = crypto.randomUUID();
    
    if (isPostgres()) {
      await db.query(
        'INSERT INTO chat_messages (id, game_id, user_id, message, message_type) VALUES ($1, $2, $3, $4, $5)',
        [id, gameId, userId, message, messageType]
      );
    } else {
      db.prepare(
        'INSERT INTO chat_messages (id, game_id, user_id, message, message_type) VALUES (?, ?, ?, ?, ?)'
      ).run(id, gameId, userId, message, messageType);
    }
    
    return id;
  }

  async getChatHistory(gameId, limit = 100) {
    const db = getDb();
    
    if (isPostgres()) {
      const result = await db.query(`
        SELECT cm.*, u.name, u.avatar FROM chat_messages cm
        JOIN users u ON cm.user_id = u.id
        WHERE cm.game_id = $1
        ORDER BY cm.created_at DESC LIMIT $2
      `, [gameId, limit]);
      return result.rows.reverse();
    } else {
      const messages = db.prepare(`
        SELECT cm.*, u.name, u.avatar FROM chat_messages cm
        JOIN users u ON cm.user_id = u.id
        WHERE cm.game_id = ?
        ORDER BY cm.created_at DESC LIMIT ?
      `).all(gameId, limit);
      return messages.reverse();
    }
  }

  // ============ PLAYER REPORTS ============
  
  async createReport(reporterId, reportedId, reason, description, gameId = null, evidence = []) {
    const db = getDb();
    const id = crypto.randomUUID();
    
    if (isPostgres()) {
      await db.query(`
        INSERT INTO player_reports (id, reporter_id, reported_id, game_id, reason, description, evidence)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [id, reporterId, reportedId, gameId, reason, description, JSON.stringify(evidence)]);
    } else {
      db.prepare(`
        INSERT INTO player_reports (id, reporter_id, reported_id, game_id, reason, description, evidence)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(id, reporterId, reportedId, gameId, reason, description, JSON.stringify(evidence));
    }
    
    return id;
  }

  async getPendingReports(limit = 50) {
    const db = getDb();
    
    if (isPostgres()) {
      const result = await db.query(`
        SELECT pr.*, 
          reporter.name as reporter_name,
          reported.name as reported_name
        FROM player_reports pr
        JOIN users reporter ON pr.reporter_id = reporter.id
        JOIN users reported ON pr.reported_id = reported.id
        WHERE pr.status = 'pending'
        ORDER BY pr.created_at ASC LIMIT $1
      `, [limit]);
      return result.rows;
    } else {
      return db.prepare(`
        SELECT pr.*, 
          reporter.name as reporter_name,
          reported.name as reported_name
        FROM player_reports pr
        JOIN users reporter ON pr.reporter_id = reporter.id
        JOIN users reported ON pr.reported_id = reported.id
        WHERE pr.status = 'pending'
        ORDER BY pr.created_at ASC LIMIT ?
      `).all(limit);
    }
  }

  async resolveReport(reportId, reviewerId, action) {
    const db = getDb();
    const now = new Date().toISOString();
    
    if (isPostgres()) {
      await db.query(`
        UPDATE player_reports SET status = 'resolved', reviewed_by = $1, reviewed_at = $2, action_taken = $3
        WHERE id = $4
      `, [reviewerId, now, action, reportId]);
    } else {
      db.prepare(`
        UPDATE player_reports SET status = 'resolved', reviewed_by = ?, reviewed_at = ?, action_taken = ?
        WHERE id = ?
      `).run(reviewerId, now, action, reportId);
    }
  }

  // ============ USER PROFILE HELPERS ============

  async getUserStats(userId) {
    const db = getDb();
    
    if (isPostgres()) {
      const result = await db.query(`
        SELECT 
          COALESCE(level, 1) as level,
          COALESCE(xp, 0) as xp,
          COALESCE(total_games, 0) as total_games,
          COALESCE(total_wins, 0) as total_wins,
          COALESCE(total_tags, 0) as total_tags,
          COALESCE(total_survival_time, 0) as total_survival_time,
          COALESCE(best_win_streak, 0) as best_win_streak,
          CASE WHEN total_games > 0 
            THEN ROUND(total_survival_time::numeric / total_games) 
            ELSE 0 
          END as avg_survival_time,
          CASE WHEN total_tags > 0 
            THEN ROUND((total_wins::numeric / total_games) * 100) 
            ELSE 0 
          END as tag_accuracy
        FROM leaderboard_entries
        WHERE user_id = $1
      `, [userId]);
      
      return result.rows[0] || {
        level: 1, xp: 0, total_games: 0, total_wins: 0, total_tags: 0,
        total_survival_time: 0, avg_survival_time: 0, tag_accuracy: 0, best_win_streak: 0
      };
    } else {
      const row = db.prepare(`
        SELECT 
          COALESCE(level, 1) as level,
          COALESCE(xp, 0) as xp,
          COALESCE(total_games, 0) as total_games,
          COALESCE(total_wins, 0) as total_wins,
          COALESCE(total_tags, 0) as total_tags,
          COALESCE(total_survival_time, 0) as total_survival_time,
          COALESCE(best_win_streak, 0) as best_win_streak,
          CASE WHEN total_games > 0 
            THEN ROUND(total_survival_time * 1.0 / total_games) 
            ELSE 0 
          END as avg_survival_time,
          CASE WHEN total_games > 0 
            THEN ROUND((total_wins * 1.0 / total_games) * 100) 
            ELSE 0 
          END as tag_accuracy
        FROM leaderboard_entries
        WHERE user_id = ?
      `).get(userId);
      
      return row || {
        level: 1, xp: 0, total_games: 0, total_wins: 0, total_tags: 0,
        total_survival_time: 0, avg_survival_time: 0, tag_accuracy: 0, best_win_streak: 0
      };
    }
  }

  async getUserRanks(userId) {
    const db = getDb();
    const ranks = {};
    
    const types = ['wins', 'tags', 'xp', 'level'];
    
    for (const type of types) {
      let column;
      switch (type) {
        case 'wins': column = 'total_wins'; break;
        case 'tags': column = 'total_tags'; break;
        case 'xp': column = 'xp'; break;
        case 'level': column = 'level'; break;
      }
      
      if (isPostgres()) {
        const result = await db.query(`
          SELECT rank FROM (
            SELECT user_id, ROW_NUMBER() OVER (ORDER BY ${column} DESC) as rank
            FROM leaderboard_entries
          ) ranked
          WHERE user_id = $1
        `, [userId]);
        ranks[type] = result.rows[0]?.rank || null;
      } else {
        const row = db.prepare(`
          SELECT (
            SELECT COUNT(*) + 1 FROM leaderboard_entries le2 
            WHERE le2.${column} > le.${column}
          ) as rank
          FROM leaderboard_entries le
          WHERE le.user_id = ?
        `).get(userId);
        ranks[type] = row?.rank || null;
      }
    }
    
    return ranks;
  }

  async getUserAchievements(userId) {
    const db = getDb();
    
    if (isPostgres()) {
      const result = await db.query(`
        SELECT a.id, a.name, a.description, a.icon, ua.earned_at
        FROM user_achievements ua
        JOIN achievements a ON ua.achievement_id = a.id
        WHERE ua.user_id = $1
        ORDER BY ua.earned_at DESC
      `, [userId]);
      return result.rows;
    } else {
      return db.prepare(`
        SELECT a.id, a.name, a.description, a.icon, ua.earned_at
        FROM user_achievements ua
        JOIN achievements a ON ua.achievement_id = a.id
        WHERE ua.user_id = ?
        ORDER BY ua.earned_at DESC
      `).all(userId) || [];
    }
  }

  async getRecentGames(userId, limit = 10) {
    const db = getDb();
    
    if (isPostgres()) {
      const result = await db.query(`
        SELECT 
          g.id, g.mode as mode_name, g.status,
          g.created_at as played_at,
          (SELECT COUNT(*) FROM game_players WHERE game_id = g.id) as player_count,
          CASE WHEN g.winner_id = $1 THEN 'win' ELSE 'loss' END as result
        FROM games g
        JOIN game_players gp ON g.id = gp.game_id
        WHERE gp.user_id = $1 AND g.status = 'ended'
        ORDER BY g.created_at DESC
        LIMIT $2
      `, [userId, limit]);
      return result.rows;
    } else {
      return db.prepare(`
        SELECT 
          g.id, g.mode as mode_name, g.status,
          g.created_at as played_at,
          (SELECT COUNT(*) FROM game_players WHERE game_id = g.id) as player_count,
          CASE WHEN g.winner_id = ? THEN 'win' ELSE 'loss' END as result
        FROM games g
        JOIN game_players gp ON g.id = gp.game_id
        WHERE gp.user_id = ? AND g.status = 'ended'
        ORDER BY g.created_at DESC
        LIMIT ?
      `).all(userId, userId, limit) || [];
    }
  }

  // ============ PUSH SUBSCRIPTIONS ============
  
  async savePushSubscription(userId, subscription) {
    const db = getDb();
    const id = crypto.randomUUID();
    
    if (isPostgres()) {
      await db.query(`
        INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (endpoint) DO UPDATE SET user_id = $2, last_used = NOW()
      `, [id, userId, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth]);
    } else {
      db.prepare(`
        INSERT OR REPLACE INTO push_subscriptions (id, user_id, endpoint, p256dh, auth)
        VALUES (?, ?, ?, ?, ?)
      `).run(id, userId, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth);
    }
  }

  async getPushSubscriptions(userId) {
    const db = getDb();
    
    if (isPostgres()) {
      const result = await db.query('SELECT * FROM push_subscriptions WHERE user_id = $1', [userId]);
      return result.rows;
    } else {
      return db.prepare('SELECT * FROM push_subscriptions WHERE user_id = ?').all(userId);
    }
  }

  async removePushSubscription(endpoint) {
    const db = getDb();
    
    if (isPostgres()) {
      await db.query('DELETE FROM push_subscriptions WHERE endpoint = $1', [endpoint]);
    } else {
      db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').run(endpoint);
    }
  }
}

export const socialDb = new SocialDb();
