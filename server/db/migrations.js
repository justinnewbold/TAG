/**
 * Database migrations and schema updates
 * Phase 1-12 database changes
 */

import { logger } from './utils/logger.js';

export const migrations = {
  // Phase 1: Add comprehensive indexes
  addIndexes: {
    postgres: `
      -- User indexes
      CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
      CREATE INDEX IF NOT EXISTS idx_users_name ON users(name);

      -- Game indexes
      CREATE INDEX IF NOT EXISTS idx_games_host_id ON games(host_id);
      CREATE INDEX IF NOT EXISTS idx_games_created_at ON games(created_at);
      CREATE INDEX IF NOT EXISTS idx_games_status_created ON games(status, created_at);

      -- Game players indexes
      CREATE INDEX IF NOT EXISTS idx_game_players_game_id ON game_players(game_id);
      CREATE INDEX IF NOT EXISTS idx_game_players_composite ON game_players(game_id, user_id);

      -- Game tags indexes
      CREATE INDEX IF NOT EXISTS idx_game_tags_tagger ON game_tags(tagger_id);
      CREATE INDEX IF NOT EXISTS idx_game_tags_tagged ON game_tags(tagged_id);
      CREATE INDEX IF NOT EXISTS idx_game_tags_timestamp ON game_tags(timestamp);

      -- User achievements indexes
      CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement ON user_achievements(achievement_id);
    `,
    sqlite: `
      CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
      CREATE INDEX IF NOT EXISTS idx_users_name ON users(name);
      CREATE INDEX IF NOT EXISTS idx_games_host_id ON games(host_id);
      CREATE INDEX IF NOT EXISTS idx_games_created_at ON games(created_at);
      CREATE INDEX IF NOT EXISTS idx_game_players_game_id ON game_players(game_id);
      CREATE INDEX IF NOT EXISTS idx_game_tags_tagger ON game_tags(tagger_id);
      CREATE INDEX IF NOT EXISTS idx_game_tags_tagged ON game_tags(tagged_id);
      CREATE INDEX IF NOT EXISTS idx_game_tags_timestamp ON game_tags(timestamp);
      CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);
    `
  },

  // Phase 2: Performance indexes for hot paths
  performanceIndexes: {
    postgres: `
      -- Active games lookup (most common query pattern)
      CREATE INDEX IF NOT EXISTS idx_games_active ON games(status) WHERE status IN ('waiting', 'active');

      -- Game code lookup (for join game)
      CREATE INDEX IF NOT EXISTS idx_games_code ON games(code) WHERE code IS NOT NULL;

      -- User stats for leaderboard queries (covering index)
      CREATE INDEX IF NOT EXISTS idx_user_stats_tags_games ON user_stats(total_tags DESC, games_played DESC);
      CREATE INDEX IF NOT EXISTS idx_user_stats_wins ON user_stats(games_won DESC);

      -- Game players with status for active player lookup
      CREATE INDEX IF NOT EXISTS idx_game_players_active ON game_players(game_id, is_it) WHERE left_at IS NULL;
      CREATE INDEX IF NOT EXISTS idx_game_players_user_active ON game_players(user_id, joined_at DESC);

      -- Game tags for recent tags query
      CREATE INDEX IF NOT EXISTS idx_game_tags_game_time ON game_tags(game_id, timestamp DESC);

      -- Leaderboard ranking queries
      CREATE INDEX IF NOT EXISTS idx_leaderboards_ranking ON leaderboards(stat_type, period, value DESC);

      -- Notifications unread count
      CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, created_at DESC) WHERE read = FALSE;

      -- Friendships accepted
      CREATE INDEX IF NOT EXISTS idx_friendships_accepted ON friendships(user_id) WHERE status = 'accepted';
      CREATE INDEX IF NOT EXISTS idx_friendships_pending ON friendships(friend_id) WHERE status = 'pending';

      -- Active bans check
      CREATE INDEX IF NOT EXISTS idx_bans_active ON bans(user_id) WHERE permanent = TRUE OR expires_at > EXTRACT(EPOCH FROM NOW()) * 1000;

      -- Matchmaking queue active
      CREATE INDEX IF NOT EXISTS idx_matchmaking_active ON matchmaking_queue(skill_rating, joined_at) WHERE status = 'waiting';

      -- Chat messages recent
      CREATE INDEX IF NOT EXISTS idx_chat_recent ON chat_messages(game_id, created_at DESC);

      -- Tournament active
      CREATE INDEX IF NOT EXISTS idx_tournaments_active ON tournaments(status, start_time) WHERE status IN ('upcoming', 'active');

      -- Season current
      CREATE INDEX IF NOT EXISTS idx_seasons_current ON seasons(end_date) WHERE end_date > EXTRACT(EPOCH FROM NOW()) * 1000;

      -- XP transactions for user history
      CREATE INDEX IF NOT EXISTS idx_xp_user_recent ON xp_transactions(user_id, created_at DESC);

      -- Clan members active
      CREATE INDEX IF NOT EXISTS idx_clan_members_active ON clan_members(clan_id) WHERE left_at IS NULL;
    `,
    sqlite: `
      -- Game code lookup (for join game)
      CREATE INDEX IF NOT EXISTS idx_games_code ON games(code);

      -- User stats for leaderboard queries
      CREATE INDEX IF NOT EXISTS idx_user_stats_tags_games ON user_stats(total_tags DESC, games_played DESC);
      CREATE INDEX IF NOT EXISTS idx_user_stats_wins ON user_stats(games_won DESC);

      -- Game players with user for active player lookup
      CREATE INDEX IF NOT EXISTS idx_game_players_user_active ON game_players(user_id, joined_at DESC);

      -- Game tags for recent tags query
      CREATE INDEX IF NOT EXISTS idx_game_tags_game_time ON game_tags(game_id, timestamp DESC);

      -- Leaderboard ranking queries
      CREATE INDEX IF NOT EXISTS idx_leaderboards_ranking ON leaderboards(stat_type, period, value DESC);

      -- Chat messages recent
      CREATE INDEX IF NOT EXISTS idx_chat_recent ON chat_messages(game_id, created_at DESC);

      -- XP transactions for user history
      CREATE INDEX IF NOT EXISTS idx_xp_user_recent ON xp_transactions(user_id, created_at DESC);
    `
  },

  // Phase 3-6: New tables for features
  createNewTables: {
    postgres: `
      -- Power-ups system
      CREATE TABLE IF NOT EXISTS power_ups (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        effect_data JSONB,
        duration INTEGER DEFAULT 0,
        rarity TEXT DEFAULT 'common',
        created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000
      );

      CREATE TABLE IF NOT EXISTS player_power_ups (
        id TEXT PRIMARY KEY,
        player_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        power_up_id TEXT REFERENCES power_ups(id) ON DELETE CASCADE,
        activated_at BIGINT,
        expires_at BIGINT,
        game_id TEXT REFERENCES games(id) ON DELETE CASCADE,
        status TEXT DEFAULT 'inventory'
      );

      CREATE INDEX IF NOT EXISTS idx_player_power_ups_player ON player_power_ups(player_id);
      CREATE INDEX IF NOT EXISTS idx_player_power_ups_game ON player_power_ups(game_id);

      -- Challenges system
      CREATE TABLE IF NOT EXISTS challenges (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        requirement JSONB NOT NULL,
        reward JSONB NOT NULL,
        type TEXT DEFAULT 'daily',
        active_date DATE,
        created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000
      );

      CREATE TABLE IF NOT EXISTS user_challenges (
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        challenge_id TEXT REFERENCES challenges(id) ON DELETE CASCADE,
        progress INTEGER DEFAULT 0,
        completed_at BIGINT,
        claimed_at BIGINT,
        PRIMARY KEY (user_id, challenge_id)
      );

      CREATE INDEX IF NOT EXISTS idx_user_challenges_user ON user_challenges(user_id);
      CREATE INDEX IF NOT EXISTS idx_challenges_type_date ON challenges(type, active_date);

      -- Cosmetics system
      CREATE TABLE IF NOT EXISTS cosmetics (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        unlock_condition JSONB,
        rarity TEXT DEFAULT 'common',
        preview_data JSONB,
        created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000
      );

      CREATE TABLE IF NOT EXISTS user_cosmetics (
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        cosmetic_id TEXT REFERENCES cosmetics(id) ON DELETE CASCADE,
        unlocked_at BIGINT NOT NULL,
        equipped BOOLEAN DEFAULT FALSE,
        PRIMARY KEY (user_id, cosmetic_id)
      );

      CREATE INDEX IF NOT EXISTS idx_user_cosmetics_user ON user_cosmetics(user_id);

      -- Game replays
      CREATE TABLE IF NOT EXISTS game_replays (
        id TEXT PRIMARY KEY,
        game_id TEXT REFERENCES games(id) ON DELETE CASCADE,
        event_data JSONB,
        player_positions JSONB,
        highlights JSONB,
        created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000
      );

      CREATE INDEX IF NOT EXISTS idx_game_replays_game ON game_replays(game_id);

      -- Reports system
      CREATE TABLE IF NOT EXISTS reports (
        id TEXT PRIMARY KEY,
        reporter_id TEXT REFERENCES users(id) ON DELETE SET NULL,
        reported_user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        game_id TEXT REFERENCES games(id) ON DELETE SET NULL,
        reason TEXT NOT NULL,
        description TEXT,
        evidence JSONB,
        status TEXT DEFAULT 'pending',
        reviewed_by TEXT,
        reviewed_at BIGINT,
        created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000
      );

      CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
      CREATE INDEX IF NOT EXISTS idx_reports_reported ON reports(reported_user_id);

      -- Bans system
      CREATE TABLE IF NOT EXISTS bans (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        reason TEXT NOT NULL,
        banned_by TEXT,
        banned_at BIGINT NOT NULL,
        expires_at BIGINT,
        permanent BOOLEAN DEFAULT FALSE,
        appeal_status TEXT DEFAULT 'none'
      );

      CREATE INDEX IF NOT EXISTS idx_bans_user ON bans(user_id);
      CREATE INDEX IF NOT EXISTS idx_bans_expires ON bans(expires_at);

      -- Leaderboards
      CREATE TABLE IF NOT EXISTS leaderboards (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        stat_type TEXT NOT NULL,
        value INTEGER DEFAULT 0,
        period TEXT NOT NULL,
        period_start BIGINT,
        updated_at BIGINT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_leaderboards_stat_period ON leaderboards(stat_type, period);
      CREATE INDEX IF NOT EXISTS idx_leaderboards_user ON leaderboards(user_id);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_leaderboards_unique ON leaderboards(user_id, stat_type, period, period_start);

      -- Notifications
      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        body TEXT,
        data JSONB,
        read BOOLEAN DEFAULT FALSE,
        created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000
      );

      CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);

      -- Analytics events
      CREATE TABLE IF NOT EXISTS analytics_events (
        id TEXT PRIMARY KEY,
        event_name TEXT NOT NULL,
        user_id TEXT,
        session_id TEXT,
        properties JSONB,
        timestamp BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000
      );

      CREATE INDEX IF NOT EXISTS idx_analytics_event_name ON analytics_events(event_name);
      CREATE INDEX IF NOT EXISTS idx_analytics_user ON analytics_events(user_id);
      CREATE INDEX IF NOT EXISTS idx_analytics_timestamp ON analytics_events(timestamp);

      -- Admin actions
      CREATE TABLE IF NOT EXISTS admin_actions (
        id TEXT PRIMARY KEY,
        admin_id TEXT NOT NULL,
        action_type TEXT NOT NULL,
        target_id TEXT,
        target_type TEXT,
        reason TEXT,
        metadata JSONB,
        timestamp BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000
      );

      CREATE INDEX IF NOT EXISTS idx_admin_actions_admin ON admin_actions(admin_id);
      CREATE INDEX IF NOT EXISTS idx_admin_actions_target ON admin_actions(target_id);

      -- Friends system (enhanced)
      CREATE TABLE IF NOT EXISTS friendships (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        friend_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        status TEXT DEFAULT 'pending',
        created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000,
        accepted_at BIGINT,
        UNIQUE(user_id, friend_id)
      );

      CREATE INDEX IF NOT EXISTS idx_friendships_user ON friendships(user_id);
      CREATE INDEX IF NOT EXISTS idx_friendships_friend ON friendships(friend_id);
      CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);

      -- Blocked users
      CREATE TABLE IF NOT EXISTS blocked_users (
        blocker_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        blocked_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000,
        PRIMARY KEY (blocker_id, blocked_id)
      );

      -- Chat messages
      CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        game_id TEXT REFERENCES games(id) ON DELETE CASCADE,
        sender_id TEXT REFERENCES users(id) ON DELETE SET NULL,
        content TEXT NOT NULL,
        type TEXT DEFAULT 'text',
        created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000
      );

      CREATE INDEX IF NOT EXISTS idx_chat_messages_game ON chat_messages(game_id);
      CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at);

      -- Matchmaking queue
      CREATE TABLE IF NOT EXISTS matchmaking_queue (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        preferences JSONB,
        skill_rating INTEGER DEFAULT 1000,
        joined_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000,
        status TEXT DEFAULT 'waiting'
      );

      CREATE INDEX IF NOT EXISTS idx_matchmaking_status ON matchmaking_queue(status);
      CREATE INDEX IF NOT EXISTS idx_matchmaking_skill ON matchmaking_queue(skill_rating);

      -- User settings/privacy
      CREATE TABLE IF NOT EXISTS user_settings (
        user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        privacy_settings JSONB DEFAULT '{}',
        notification_settings JSONB DEFAULT '{}',
        game_settings JSONB DEFAULT '{}',
        accessibility_settings JSONB DEFAULT '{}',
        updated_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000
      );

      -- Rate limiting
      CREATE TABLE IF NOT EXISTS rate_limits (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        action_type TEXT NOT NULL,
        count INTEGER DEFAULT 0,
        window_start BIGINT NOT NULL,
        UNIQUE(user_id, action_type)
      );

      CREATE INDEX IF NOT EXISTS idx_rate_limits_user_action ON rate_limits(user_id, action_type);
    `,
    sqlite: `
      -- Power-ups system
      CREATE TABLE IF NOT EXISTS power_ups (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        effect_data TEXT,
        duration INTEGER DEFAULT 0,
        rarity TEXT DEFAULT 'common',
        created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
      );

      CREATE TABLE IF NOT EXISTS player_power_ups (
        id TEXT PRIMARY KEY,
        player_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        power_up_id TEXT REFERENCES power_ups(id) ON DELETE CASCADE,
        activated_at INTEGER,
        expires_at INTEGER,
        game_id TEXT REFERENCES games(id) ON DELETE CASCADE,
        status TEXT DEFAULT 'inventory'
      );

      CREATE INDEX IF NOT EXISTS idx_player_power_ups_player ON player_power_ups(player_id);
      CREATE INDEX IF NOT EXISTS idx_player_power_ups_game ON player_power_ups(game_id);

      -- Challenges system
      CREATE TABLE IF NOT EXISTS challenges (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        requirement TEXT NOT NULL,
        reward TEXT NOT NULL,
        type TEXT DEFAULT 'daily',
        active_date TEXT,
        created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
      );

      CREATE TABLE IF NOT EXISTS user_challenges (
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        challenge_id TEXT REFERENCES challenges(id) ON DELETE CASCADE,
        progress INTEGER DEFAULT 0,
        completed_at INTEGER,
        claimed_at INTEGER,
        PRIMARY KEY (user_id, challenge_id)
      );

      CREATE INDEX IF NOT EXISTS idx_user_challenges_user ON user_challenges(user_id);
      CREATE INDEX IF NOT EXISTS idx_challenges_type_date ON challenges(type, active_date);

      -- Cosmetics system
      CREATE TABLE IF NOT EXISTS cosmetics (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        unlock_condition TEXT,
        rarity TEXT DEFAULT 'common',
        preview_data TEXT,
        created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
      );

      CREATE TABLE IF NOT EXISTS user_cosmetics (
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        cosmetic_id TEXT REFERENCES cosmetics(id) ON DELETE CASCADE,
        unlocked_at INTEGER NOT NULL,
        equipped INTEGER DEFAULT 0,
        PRIMARY KEY (user_id, cosmetic_id)
      );

      CREATE INDEX IF NOT EXISTS idx_user_cosmetics_user ON user_cosmetics(user_id);

      -- Game replays
      CREATE TABLE IF NOT EXISTS game_replays (
        id TEXT PRIMARY KEY,
        game_id TEXT REFERENCES games(id) ON DELETE CASCADE,
        event_data TEXT,
        player_positions TEXT,
        highlights TEXT,
        created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
      );

      CREATE INDEX IF NOT EXISTS idx_game_replays_game ON game_replays(game_id);

      -- Reports system
      CREATE TABLE IF NOT EXISTS reports (
        id TEXT PRIMARY KEY,
        reporter_id TEXT REFERENCES users(id) ON DELETE SET NULL,
        reported_user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        game_id TEXT REFERENCES games(id) ON DELETE SET NULL,
        reason TEXT NOT NULL,
        description TEXT,
        evidence TEXT,
        status TEXT DEFAULT 'pending',
        reviewed_by TEXT,
        reviewed_at INTEGER,
        created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
      );

      CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
      CREATE INDEX IF NOT EXISTS idx_reports_reported ON reports(reported_user_id);

      -- Bans system
      CREATE TABLE IF NOT EXISTS bans (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        reason TEXT NOT NULL,
        banned_by TEXT,
        banned_at INTEGER NOT NULL,
        expires_at INTEGER,
        permanent INTEGER DEFAULT 0,
        appeal_status TEXT DEFAULT 'none'
      );

      CREATE INDEX IF NOT EXISTS idx_bans_user ON bans(user_id);
      CREATE INDEX IF NOT EXISTS idx_bans_expires ON bans(expires_at);

      -- Leaderboards
      CREATE TABLE IF NOT EXISTS leaderboards (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        stat_type TEXT NOT NULL,
        value INTEGER DEFAULT 0,
        period TEXT NOT NULL,
        period_start INTEGER,
        updated_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_leaderboards_stat_period ON leaderboards(stat_type, period);
      CREATE INDEX IF NOT EXISTS idx_leaderboards_user ON leaderboards(user_id);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_leaderboards_unique ON leaderboards(user_id, stat_type, period, period_start);

      -- Notifications
      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        body TEXT,
        data TEXT,
        read INTEGER DEFAULT 0,
        created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
      );

      CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);

      -- Analytics events
      CREATE TABLE IF NOT EXISTS analytics_events (
        id TEXT PRIMARY KEY,
        event_name TEXT NOT NULL,
        user_id TEXT,
        session_id TEXT,
        properties TEXT,
        timestamp INTEGER DEFAULT (strftime('%s', 'now') * 1000)
      );

      CREATE INDEX IF NOT EXISTS idx_analytics_event_name ON analytics_events(event_name);
      CREATE INDEX IF NOT EXISTS idx_analytics_user ON analytics_events(user_id);
      CREATE INDEX IF NOT EXISTS idx_analytics_timestamp ON analytics_events(timestamp);

      -- Admin actions
      CREATE TABLE IF NOT EXISTS admin_actions (
        id TEXT PRIMARY KEY,
        admin_id TEXT NOT NULL,
        action_type TEXT NOT NULL,
        target_id TEXT,
        target_type TEXT,
        reason TEXT,
        metadata TEXT,
        timestamp INTEGER DEFAULT (strftime('%s', 'now') * 1000)
      );

      CREATE INDEX IF NOT EXISTS idx_admin_actions_admin ON admin_actions(admin_id);
      CREATE INDEX IF NOT EXISTS idx_admin_actions_target ON admin_actions(target_id);

      -- Friends system (enhanced)
      CREATE TABLE IF NOT EXISTS friendships (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        friend_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        status TEXT DEFAULT 'pending',
        created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
        accepted_at INTEGER,
        UNIQUE(user_id, friend_id)
      );

      CREATE INDEX IF NOT EXISTS idx_friendships_user ON friendships(user_id);
      CREATE INDEX IF NOT EXISTS idx_friendships_friend ON friendships(friend_id);
      CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);

      -- Blocked users
      CREATE TABLE IF NOT EXISTS blocked_users (
        blocker_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        blocked_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
        PRIMARY KEY (blocker_id, blocked_id)
      );

      -- Chat messages
      CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        game_id TEXT REFERENCES games(id) ON DELETE CASCADE,
        sender_id TEXT REFERENCES users(id) ON DELETE SET NULL,
        content TEXT NOT NULL,
        type TEXT DEFAULT 'text',
        created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
      );

      CREATE INDEX IF NOT EXISTS idx_chat_messages_game ON chat_messages(game_id);
      CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at);

      -- Matchmaking queue
      CREATE TABLE IF NOT EXISTS matchmaking_queue (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        preferences TEXT,
        skill_rating INTEGER DEFAULT 1000,
        joined_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
        status TEXT DEFAULT 'waiting'
      );

      CREATE INDEX IF NOT EXISTS idx_matchmaking_status ON matchmaking_queue(status);
      CREATE INDEX IF NOT EXISTS idx_matchmaking_skill ON matchmaking_queue(skill_rating);

      -- User settings/privacy
      CREATE TABLE IF NOT EXISTS user_settings (
        user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        privacy_settings TEXT DEFAULT '{}',
        notification_settings TEXT DEFAULT '{}',
        game_settings TEXT DEFAULT '{}',
        accessibility_settings TEXT DEFAULT '{}',
        updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
      );

      -- Rate limiting
      CREATE TABLE IF NOT EXISTS rate_limits (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        action_type TEXT NOT NULL,
        count INTEGER DEFAULT 0,
        window_start INTEGER NOT NULL,
        UNIQUE(user_id, action_type)
      );

      CREATE INDEX IF NOT EXISTS idx_rate_limits_user_action ON rate_limits(user_id, action_type);
    `
  }
};

export async function runMigrations(db, isPostgres) {
  logger.info('Running database migrations...');

  try {
    if (isPostgres) {
      // Run PostgreSQL migrations
      await db.query(migrations.addIndexes.postgres);
      await db.query(migrations.performanceIndexes.postgres);
      await db.query(migrations.createNewTables.postgres);
    } else {
      // Run SQLite migrations
      db.exec(migrations.addIndexes.sqlite);
      db.exec(migrations.performanceIndexes.sqlite);
      db.exec(migrations.createNewTables.sqlite);
    }
    logger.info('Database migrations completed successfully');
  } catch (error) {
    logger.error('Migration error:', error);
    throw error;
  }
}

export default { migrations, runMigrations };
